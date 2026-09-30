import type {
  CloudProvider,
  CloudProviderStatus
} from "./CloudProvider";

const CONNECT_WINDOW_NAME =
  "oqerun-google-drive-connect";

const DEFAULT_CLOUD_API_URL =
  "https://oqerun-os.vercel.app";

export type GoogleConnectionStatus = {
  connected: boolean;
  provider?: string;
  error?: string;
};

export class GoogleDriveProvider
  implements CloudProvider
{
  readonly id = "google-drive";
  readonly name = "Google Drive";
  readonly description =
    "Direct Google Drive connection through Oqerun's secure backend.";

  get status(): CloudProviderStatus {
    return this.connectUrl
      ? "available"
      : "configuration-required";
  }

  async connect(): Promise<void> {
    const url = this.connectUrl;

    if (!url) {
      throw new Error(
        "Google Drive connection is not configured yet."
      );
    }

    const popup = window.open(
      url,
      CONNECT_WINDOW_NAME,
      "popup,width=980,height=760,resizable=yes,scrollbars=yes"
    );

    if (!popup) {
      throw new Error(
        "The secure Google Drive connection window was blocked. Allow pop-ups for Oqerun and try again."
      );
    }

    popup.focus();
  }

  async getConnectionStatus(): Promise<GoogleConnectionStatus> {
    const url = this.apiUrl("/api/cloud/google/status");

    if (!url) {
      return {
        connected: false,
        error: "Cloud API is not configured."
      };
    }

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        "The cloud connection status could not be checked."
      );
    }

    return (
      await response.json()
    ) as GoogleConnectionStatus;
  }

  async disconnect(): Promise<void> {
    const url = this.apiUrl(
      "/api/cloud/google/disconnect"
    );

    if (!url) {
      throw new Error(
        "Cloud API is not configured."
      );
    }

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        "The Google Drive session could not be disconnected."
      );
    }
  }

  async waitForConnection(
    timeoutMs = 120_000
  ): Promise<boolean> {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      try {
        const status =
          await this.getConnectionStatus();

        if (status.connected) {
          return true;
        }
      } catch {
        // Keep polling while the OAuth popup is active.
      }

      await new Promise(resolve =>
        window.setTimeout(resolve, 1200)
      );
    }

    return false;
  }

  private get connectUrl(): string {
    const url = this.apiUrl(
      "/api/cloud/google/connect"
    );

    return url ?? "";
  }

  private apiUrl(path: string): string | null {
    const configured =
      (
        import.meta.env
          .VITE_OQERUN_CLOUD_API_URL || ""
      ).trim();

    const backend =
      configured || DEFAULT_CLOUD_API_URL;

    return new URL(
      path,
      backend.endsWith("/")
        ? backend
        : `${backend}/`
    ).toString();
  }
}
