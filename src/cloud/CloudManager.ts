import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import type {
  CloudProvider,
  CloudProviderStatus
} from "./CloudProvider";
import { UnifiedCloudProvider } from "./UnifiedCloudProvider";

export class CloudManager {
  private readonly WINDOW_ID =
    "cloud-manager";

  private readonly provider:
    CloudProvider;

  private connectionMessage =
    "Choose a provider and browse your cloud files.";

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {
    this.provider =
      new UnifiedCloudProvider({
        onConfigurationRequired:
          () => {
            this.connectionMessage =
              "Cloud connection is not configured. Oqerun will never ask you to enter a cloud password, OAuth client secret, or access token here.";
            this.refreshProviderStatus();
          },

        onConnectionStarted:
          () => {
            this.connectionMessage =
              "Secure connection opened in a separate window. Review the provider name and requested permissions before approving access.";
            this.refreshProviderStatus();
          }
      });
  }

  open(): void {
    this.wm.open({
      id: this.WINDOW_ID,
      title: "Connected Cloud",
      width: 700,
      height: 470,
      x: 120,
      y: 70,
      content: this.render()
    });

    requestAnimationFrame(() => {
      this.bindEvents();
    });
  }

  private render(): string {
    return `
      <div class="cloud-manager">
        <div class="cloud-manager-header">
          <div>
            <h2>Connected Cloud</h2>
            <p>
              Connect multiple cloud storage services through one unified picker.
            </p>
          </div>

          <span class="cloud-manager-badge">
            Unified
          </span>
        </div>

        <div class="cloud-provider-grid">
          ${this.renderProvider()}
        </div>

        <div class="cloud-manager-note">
          <strong>
            One cloud connection layer.
          </strong>

          <span>
            Google Drive, OneDrive, Dropbox and other supported file-storage
            services are opened through the same Oqerun cloud interface.
          </span>
        </div>
      </div>
    `;
  }

  private renderProvider(): string {
    const status =
      this.provider.status;

    const statusText:
      Record<
        CloudProviderStatus,
        string
      > = {
        connected:
          "Connected",
        available:
          "Ready to connect",
        "configuration-required":
          "Configuration required"
      };

    const actionText =
      status === "connected"
        ? "Manage cloud"
        : "Connect cloud";

    return `
      <section
        class="cloud-provider-card cloud-provider-card-unified"
        data-provider="unified-cloud"
      >
        <div class="cloud-provider-icon cloud-unified-icon">
          ☁
        </div>

        <div class="cloud-provider-body">
          <div class="cloud-provider-title-row">
            <h3>Unified Cloud</h3>

            <span
              id="cloud-provider-status"
              class="cloud-provider-status status-${status}"
            >
              ${statusText[status]}
            </span>
          </div>

          <p>
            Google Drive, OneDrive, Dropbox, Box, SharePoint and other
            supported storage services from one connection flow.
          </p>

          <div class="cloud-provider-services">
            <span>Google Drive</span>
            <span>OneDrive</span>
            <span>Dropbox</span>
            <span>More</span>
          </div>

          <div
            id="cloud-provider-selection"
            class="cloud-provider-selection"
          >
            ${this.escapeHtml(selectionText)}
          </div>

          <button
            class="cloud-provider-action"
            data-cloud-action="connect"
            type="button"
          >
            ${actionText}
          </button>

          ${
            status === "connected"
              ? `
                <button
                  class="cloud-provider-action cloud-provider-secondary-action"
                  data-cloud-action="disconnect"
                  type="button"
                >
                  Disconnect session
                </button>
              `
              : ""
          }
        </div>
      </section>
    `;
  }

  private bindEvents(): void {
    const win =
      document.getElementById(
        this.WINDOW_ID
      );

    if (!win) return;

    win
      .querySelectorAll<HTMLButtonElement>(
        "[data-cloud-action]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            void this.handleProviderAction(
              button.dataset.cloudAction ||
                ""
            );
          }
        );
      });
  }

  private async handleProviderAction(
    action: string
  ): Promise<void> {
    try {
      if (
        action ===
        "disconnect"
      ) {
        await this.provider.disconnect();

        this.kernel.notify.info(
          "Unified Cloud",
          "The cloud session has been disconnected."
        );

        this.refreshProviderStatus();

        return;
      }

      await this.provider.connect();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Cloud connection could not be started.";

      this.kernel.notify.info(
        "Unified Cloud",
        message
      );
    }
  }

  private refreshProviderStatus(): void {
    const win =
      document.getElementById(
        this.WINDOW_ID
      );

    if (!win) return;

    const status =
      this.provider.status;

    const statusElement =
      win.querySelector<HTMLElement>(
        "#cloud-provider-status"
      );

    if (statusElement) {
      statusElement.textContent =
        this.statusText(status);

      statusElement.className =
        `cloud-provider-status status-${status}`;
    }

    const selectionElement =
      win.querySelector<HTMLElement>(
        "#cloud-provider-selection"
      );

    if (selectionElement) {
      selectionElement.textContent =
        this.connectionMessage;
    }
  }

  private statusText(
    status: CloudProviderStatus
  ): string {
    const labels:
      Record<
        CloudProviderStatus,
        string
      > = {
        connected:
          "Connected",
        available:
          "Ready to connect",
        "configuration-required":
          "Configuration required"
      };

    return labels[status];
  }

  private escapeHtml(
    value: string
  ): string {
    return value
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }
}
