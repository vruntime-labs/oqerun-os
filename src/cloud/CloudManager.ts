import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import type { CloudProviderStatus } from "./CloudProvider";
import { GoogleDriveProvider } from "./GoogleDriveProvider";

export class CloudManager {
  private readonly WINDOW_ID = "cloud-manager";
  private readonly provider: GoogleDriveProvider;

  private connectionMessage =
    "Connect Google Drive through Google's secure authorization page.";

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {
    this.provider =
      new GoogleDriveProvider();
  }

  open(): void {
    this.wm.open({
      id: this.WINDOW_ID,
      title: "Connected Cloud",
      width: 700,
      height: 500,
      x: 120,
      y: 70,
      content: this.render()
    });

    requestAnimationFrame(() => {
      this.bindEvents();
      void this.refreshConnectionStatus();
    });
  }

  private render(): string {
    const status =
      this.provider.status;

    return `
      <div class="cloud-manager">
        <div class="cloud-manager-header">
          <div>
            <h2>Connected Cloud</h2>
            <p>
              Connect your own cloud storage account directly to Oqerun.
            </p>
          </div>

          <span class="cloud-manager-badge">
            Direct APIs
          </span>
        </div>

        <div class="cloud-provider-grid">
          ${this.renderProvider(status)}
        </div>

        <div class="cloud-manager-note">
          <strong>
            Your credentials stay server-side.
          </strong>

          <span>
            Oqerun sends you to the provider's official authorization page.
            Passwords, OAuth secrets and refresh tokens are never entered into
            the OS or exposed to the browser.
          </span>
        </div>
      </div>
    `;
  }

  private renderProvider(
    status: CloudProviderStatus
  ): string {
    const statusText =
      status === "available"
        ? "Ready to connect"
        : "Not configured";

    return `
      <section
        class="cloud-provider-card cloud-provider-card-unified"
        data-provider="google-drive"
      >
        <div class="cloud-provider-icon cloud-unified-icon">
          G
        </div>

        <div class="cloud-provider-body">
          <div class="cloud-provider-title-row">
            <h3>Google Drive</h3>

            <span
              id="cloud-provider-status"
              class="cloud-provider-status status-${status}"
            >
              ${statusText}
            </span>
          </div>

          <p>
            Direct Google Drive integration using Google's OAuth 2.0 flow
            and Oqerun's secure cloud backend.
          </p>

          <div class="cloud-provider-services">
            <span>Google OAuth</span>
            <span>Cloudflare KV sessions</span>
            <span>Encrypted tokens</span>
          </div>

          <div class="cloud-security-note">
            <strong>Security</strong>
            <span>
              Oqerun never asks you to paste a Google password, OAuth client
              secret, refresh token, or bearer token into the OS.
            </span>
          </div>

          <div
            id="cloud-provider-selection"
            class="cloud-provider-selection"
          >
            ${this.escapeHtml(
              this.connectionMessage
            )}
          </div>

          <button
            class="cloud-provider-action"
            data-cloud-action="connect"
            type="button"
          >
            Connect Google Drive
          </button>

          <button
            class="cloud-provider-action cloud-provider-secondary-action"
            data-cloud-action="disconnect"
            type="button"
            style="display:none;"
          >
            Disconnect session
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
              button.dataset.cloudAction || ""
            );
          }
        );
      });

    window.addEventListener(
      "message",
      this.handleCloudMessage
    );
  }

  private handleCloudMessage = (
    event: MessageEvent
  ): void => {
    if (
      event.data?.source !==
      "oqerun-cloud"
    ) {
      return;
    }

    if (
      event.data?.type ===
      "google-connected"
    ) {
      if (typeof event.data?.sessionId === "string") {
        this.provider.setSessionToken(
          event.data.sessionId
        );
      }

      this.connectionMessage =
        "Google Drive is securely connected.";
      void this.refreshConnectionStatus();
    }

    if (
      event.data?.type ===
      "google-error"
    ) {
      this.connectionMessage =
        "Google Drive authorization did not complete.";
      this.refreshConnectionStatus();
    }
  };

  private async handleProviderAction(
    action: string
  ): Promise<void> {
    try {
      if (action === "disconnect") {
        await this.provider.disconnect();
        this.provider.clearSessionToken();

        this.connectionMessage =
          "The Google Drive session has been disconnected.";

        this.kernel.notify.info(
          "Google Drive",
          "The cloud session has been disconnected."
        );

        await this.refreshConnectionStatus();
        return;
      }

      if (action !== "connect") {
        return;
      }

      this.connectionMessage =
        "Secure Google authorization opened. Review the requested permissions before approving access.";

      this.refreshProviderMessage();

      await this.provider.connect();

      const connected =
        await this.provider.waitForConnection();

      if (connected) {
        this.connectionMessage =
          "Google Drive is securely connected to Oqerun.";

        this.kernel.notify.info(
          "Google Drive",
          "Google Drive is now connected."
        );
      } else {
        this.connectionMessage =
          "The connection window timed out. If you approved access, reopen Cloud to check the session.";
      }

      await this.refreshConnectionStatus();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Google Drive connection could not be started.";

      this.connectionMessage =
        message;

      this.kernel.notify.info(
        "Google Drive",
        message
      );

      this.refreshProviderMessage();
    }
  }

  private async refreshConnectionStatus(): Promise<void> {
    try {
      const status =
        await this.provider.getConnectionStatus();

      const win =
        document.getElementById(
          this.WINDOW_ID
        );

      if (!win) return;

      const statusElement =
        win.querySelector<HTMLElement>(
          "#cloud-provider-status"
        );

      const disconnectButton =
        win.querySelector<HTMLButtonElement>(
          '[data-cloud-action="disconnect"]'
        );

      const connectButton =
        win.querySelector<HTMLButtonElement>(
          '[data-cloud-action="connect"]'
        );

      if (status.connected) {
        if (statusElement) {
          statusElement.textContent =
            "Connected";
          statusElement.className =
            "cloud-provider-status status-connected";
        }

        if (disconnectButton) {
          disconnectButton.style.display =
            "";
        }

        if (connectButton) {
          connectButton.textContent =
            "Reconnect Google Drive";
        }

        this.connectionMessage =
          "Google Drive is securely connected to Oqerun.";
      } else {
        if (statusElement) {
          statusElement.textContent =
            this.provider.status ===
            "available"
              ? "Ready to connect"
              : "Not configured";

          statusElement.className =
            `cloud-provider-status status-${this.provider.status}`;
        }

        if (disconnectButton) {
          disconnectButton.style.display =
            "none";
        }

        if (connectButton) {
          connectButton.textContent =
            "Connect Google Drive";
        }

        if (status.error) {
          this.connectionMessage =
            status.error;
        }
      }

      this.refreshProviderMessage();
    } catch (error) {
      this.connectionMessage =
        error instanceof Error
          ? error.message
          : "Cloud connection status is unavailable.";

      this.refreshProviderMessage();
    }
  }

  private refreshProviderMessage(): void {
    const win =
      document.getElementById(
        this.WINDOW_ID
      );

    if (!win) return;

    const selectionElement =
      win.querySelector<HTMLElement>(
        "#cloud-provider-selection"
      );

    if (selectionElement) {
      selectionElement.textContent =
        this.connectionMessage;
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
