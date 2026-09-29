import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import type {
  CloudProvider,
  CloudProviderStatus
} from "./CloudProvider";
import { GoogleDriveProvider } from "./GoogleDriveProvider";
import { OneDriveProvider } from "./OneDriveProvider";

export class CloudManager {
  private readonly WINDOW_ID =
    "cloud-manager";

  private readonly providers: CloudProvider[] = [
    new GoogleDriveProvider(),
    new OneDriveProvider()
  ];

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

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
              Connect cloud storage and use it from Oqerun Explorer.
            </p>
          </div>
          <span class="cloud-manager-badge">
            Provider-based
          </span>
        </div>

        <div class="cloud-provider-grid">
          ${this.providers
            .map(provider => this.renderProvider(provider))
            .join("")}
        </div>

        <div class="cloud-manager-note">
          <strong>Your files stay with the provider.</strong>
          <span>
            Oqerun will request access only when you connect a provider.
          </span>
        </div>
      </div>
    `;
  }

  private renderProvider(
    provider: CloudProvider
  ): string {
    const status = provider.status;

    const statusText: Record<
      CloudProviderStatus,
      string
    > = {
      connected: "Connected",
      available: "Ready to configure",
      "configuration-required":
        "Configuration required"
    };

    const actionText =
      status === "connected"
        ? "Disconnect"
        : "Connect";

    return `
      <section
        class="cloud-provider-card"
        data-provider="${provider.id}"
      >
        <div class="cloud-provider-icon">
          ☁
        </div>

        <div class="cloud-provider-body">
          <div class="cloud-provider-title-row">
            <h3>${this.escapeHtml(provider.name)}</h3>
            <span
              class="cloud-provider-status status-${status}"
            >
              ${statusText[status]}
            </span>
          </div>

          <p>
            ${this.escapeHtml(provider.description)}
          </p>

          <button
            class="cloud-provider-action"
            data-cloud-action="${status === "connected" ? "disconnect" : "connect"}"
            data-provider="${provider.id}"
            type="button"
          >
            ${actionText}
          </button>
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
              button.dataset.provider || "",
              button.dataset.cloudAction || ""
            );
          }
        );
      });
  }

  private async handleProviderAction(
    providerId: string,
    action: string
  ): Promise<void> {
    const provider =
      this.providers.find(
        item => item.id === providerId
      );

    if (!provider) return;

    try {
      if (action === "disconnect") {
        await provider.disconnect();

        this.kernel.notify.info(
          provider.name,
          "The cloud session will be disconnected when provider authentication is enabled."
        );

        return;
      }

      await provider.connect();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Cloud connection could not be started.";

      this.kernel.notify.info(
        provider.name,
        message
      );
    }
  }

  private escapeHtml(
    value: string
  ): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
