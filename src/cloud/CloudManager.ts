import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import { Explorer } from "../shell/Explorer";
import { GoogleDriveProvider } from "./GoogleDriveProvider";
import { OneDriveProvider } from "./OneDriveProvider";
import { DropboxProvider } from "./DropboxProvider";

type Provider = GoogleDriveProvider | OneDriveProvider | DropboxProvider;

type ConnectionStatus = {
  connected: boolean;
  provider?: string;
  error?: string;
};

type ProviderState = {
  connected: boolean;
  available: boolean;
};

export class CloudManager {
  private readonly WINDOW_ID = "cloud-manager";

  private readonly providers: Provider[] = [
    new GoogleDriveProvider(),
    new OneDriveProvider(),
    new DropboxProvider()
  ];

  private readonly state = new Map<string, ProviderState>();

  private readonly messages = new Map<string, string>([
    [
      "google-drive",
      "Connect Google Drive to use it as part of your Oqerun virtual storage."
    ],
    [
      "onedrive",
      "OneDrive integration is coming soon."
    ],
    [
      "dropbox",
      "Dropbox integration is coming soon."
    ]
  ]);

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {
    this.providers.forEach(provider => {
      this.state.set(provider.id, {
        connected: false,
        available: provider.id === "google-drive"
      });
    });
  }

  open(): void {
    this.wm.open({
      id: this.WINDOW_ID,
      title: "Cloud Storage",
      width: 760,
      height: 560,
      x: 100,
      y: 60,
      content: this.render()
    });

    requestAnimationFrame(() => {
      this.bindEvents();
      void this.refreshAll();
    });
  }

  private render(): string {
    return `
      <div class="cloud-manager">
        <div class="cloud-manager-header">
          <div>
            <h2>Cloud Storage</h2>
            <p>Your Virtual SSD</p>
          </div>
          <span class="cloud-manager-badge">VIRTUAL STORAGE</span>
        </div>

        <div class="cloud-provider-grid">
          ${this.providers.map(provider => this.renderProvider(provider)).join("")}
        </div>

        <div class="cloud-manager-note">
          <strong>One storage layer.</strong>
          <span>
            Connected cloud providers appear here as virtual storage.
            Oqerun can add more providers without changing the file system design.
          </span>
        </div>
      </div>
    `;
  }

  private renderProvider(provider: Provider): string {
    const icon =
      provider.id === "google-drive"
        ? "G"
        : provider.id === "onedrive"
          ? "O"
          : "D";

    const available =
      this.state.get(provider.id)?.available ?? false;

    const statusText =
      available
        ? "Checking…"
        : "Coming Soon";

    return `
      <section
        class="cloud-provider-card${available ? "" : " cloud-provider-unavailable"}"
        data-provider="${provider.id}"
      >
        <div class="cloud-provider-icon cloud-unified-icon">${icon}</div>

        <div class="cloud-provider-body">
          <div class="cloud-provider-title-row">
            <div>
              <h3>${provider.name}</h3>
              <span class="cloud-provider-status" data-status>
                ${statusText}
              </span>
            </div>
          </div>

          <p>${provider.description}</p>

          <div class="cloud-provider-actions">
            <button
              class="cloud-provider-open"
              data-action="open"
              type="button"
              disabled
            >
              Open Cloud
            </button>

            <button
              class="cloud-provider-action"
              data-action="connect"
              type="button"
              ${available ? "" : "disabled"}
            >
              ${available ? "Connect " + provider.name : "Coming Soon"}
            </button>

            <button
              class="cloud-provider-action cloud-provider-secondary-action"
              data-action="disconnect"
              type="button"
              style="display:none"
            >
              Disconnect
            </button>
          </div>

          <div class="cloud-provider-selection" data-message>
            ${this.messages.get(provider.id) ?? ""}
          </div>
        </div>
      </section>
    `;
  }

  private bindEvents(): void {
    const win = document.getElementById(this.WINDOW_ID);
    if (!win) return;

    win.querySelectorAll<HTMLElement>("[data-provider]").forEach(card => {
      const id = card.dataset.provider ?? "";
      const provider = this.providers.find(
        item => item.id === id
      );

      if (!provider) return;

      card.querySelector<HTMLButtonElement>(
        '[data-action="open"]'
      )?.addEventListener("click", () => {
        this.openProvider(provider);
      });

      card.querySelector<HTMLButtonElement>(
        '[data-action="connect"]'
      )?.addEventListener("click", () => {
        void this.connect(provider);
      });

      card.querySelector<HTMLButtonElement>(
        '[data-action="disconnect"]'
      )?.addEventListener("click", () => {
        void this.disconnect(provider);
      });
    });
  }

  private async refreshAll(): Promise<void> {
    for (const provider of this.providers) {
      await this.refresh(provider);
    }
  }

  private async refresh(provider: Provider): Promise<void> {
    const available =
      this.state.get(provider.id)?.available ?? false;

    if (!available) {
      this.refreshCard(
        provider.id,
        "unavailable",
        false,
        false
      );
      return;
    }

    try {
      const status =
        await provider.getConnectionStatus() as ConnectionStatus;

      this.state.set(provider.id, {
        available: true,
        connected: status.connected
      });

      this.refreshCard(
        provider.id,
        status.connected ? "connected" : "available",
        status.connected,
        true
      );

      if (status.connected) {
        this.setMessage(
          provider.id,
          provider.name + " is securely connected to Oqerun."
        );
      } else if (status.error) {
        this.setMessage(provider.id, status.error);
      } else {
        this.setMessage(
          provider.id,
          "Connect " + provider.name + " to use it as virtual storage."
        );
      }
    } catch (error) {
      this.refreshCard(
        provider.id,
        "error",
        false,
        true
      );

      this.setMessage(
        provider.id,
        error instanceof Error
          ? error.message
          : provider.name + " connection status is unavailable."
      );
    }
  }

  private async connect(provider: Provider): Promise<void> {
    if (!(this.state.get(provider.id)?.available ?? false)) {
      this.setMessage(
        provider.id,
        provider.name + " integration is coming soon."
      );
      return;
    }

    this.setMessage(
      provider.id,
      "Secure authorization opened. Approve only the permissions you expect."
    );

    this.refreshCard(
      provider.id,
      "connecting",
      false,
      true
    );

    try {
      await provider.connect();

      this.setMessage(
        provider.id,
        provider.name + " is securely connected to Oqerun."
      );

      this.kernel.notify.info(
        provider.name,
        provider.name + " is now connected."
      );

      await this.refresh(provider);
    } catch (error) {
      this.setMessage(
        provider.id,
        error instanceof Error
          ? error.message
          : provider.name + " connection failed."
      );

      this.refreshCard(
        provider.id,
        "error",
        false,
        true
      );
    }
  }

  private async disconnect(provider: Provider): Promise<void> {
    try {
      await provider.disconnect();

      if ("clearSessionToken" in provider) {
        provider.clearSessionToken();
      }

      this.state.set(provider.id, {
        available:
          this.state.get(provider.id)?.available ?? false,
        connected: false
      });

      this.setMessage(
        provider.id,
        provider.name + " has been disconnected."
      );

      await this.refresh(provider);
    } catch (error) {
      this.setMessage(
        provider.id,
        error instanceof Error
          ? error.message
          : provider.name + " disconnect failed."
      );

      this.refreshCard(
        provider.id,
        "error",
        false,
        true
      );
    }
  }

  private openProvider(provider: Provider): void {
    const paths: Record<string, string> = {
      "google-drive": "/mnt/cloud/google-drive",
      "onedrive": "/mnt/cloud/onedrive",
      "dropbox": "/mnt/cloud/dropbox"
    };

    const path = paths[provider.id];

    if (!path) return;

    if (!(this.state.get(provider.id)?.connected ?? false)) {
      this.kernel.notify.warning(
        provider.name,
        "Connect " + provider.name + " before opening its cloud storage."
      );
      return;
    }

    if (provider.id !== "google-drive") {
      this.kernel.notify.info(
        provider.name,
        provider.name + " cloud browsing is coming soon."
      );
      return;
    }

    void new Explorer(
      this.kernel,
      this.wm
    ).open(path);
  }

  private refreshCard(
    id: string,
    state: string,
    connected: boolean,
    available: boolean
  ): void {
    const win =
      document.getElementById(this.WINDOW_ID);

    const card =
      win?.querySelector<HTMLElement>(
        '[data-provider="' + id + '"]'
      );

    if (!card) return;

    const status =
      card.querySelector<HTMLElement>("[data-status]");

    const connect =
      card.querySelector<HTMLButtonElement>(
        '[data-action="connect"]'
      );

    const open =
      card.querySelector<HTMLButtonElement>(
        '[data-action="open"]'
      );

    const disconnect =
      card.querySelector<HTMLButtonElement>(
        '[data-action="disconnect"]'
      );

    const provider =
      this.providers.find(item => item.id === id);

    if (status) {
      if (!available) {
        status.textContent = "Coming Soon";
      } else if (connected) {
        status.textContent = "Connected";
      } else if (state === "connecting") {
        status.textContent = "Connecting…";
      } else if (state === "error") {
        status.textContent = "Connection Error";
      } else {
        status.textContent = "Not Connected";
      }

      status.className =
        "cloud-provider-status " +
        (!available
          ? "status-unavailable"
          : connected
            ? "status-connected"
            : "status-available");
    }

    if (open) {
      open.disabled =
        !available ||
        !connected ||
        id !== "google-drive";
    }

    if (connect) {
      connect.disabled = !available;
      connect.textContent =
        connected
          ? "Reconnect " + (provider?.name ?? "")
          : available
            ? "Connect " + (provider?.name ?? "")
            : "Coming Soon";
    }

    if (disconnect) {
      disconnect.style.display =
        connected ? "" : "none";
    }

    if (!available) {
      card.classList.add("cloud-provider-unavailable");
    } else {
      card.classList.remove("cloud-provider-unavailable");
    }
  }

  private setMessage(
    id: string,
    message: string
  ): void {
    this.messages.set(id, message);

    const card =
      document
        .getElementById(this.WINDOW_ID)
        ?.querySelector<HTMLElement>(
          '[data-provider="' + id + '"]'
        );

    const element =
      card?.querySelector<HTMLElement>(
        "[data-message]"
      );

    if (element) {
      element.textContent = message;
    }
  }
}
