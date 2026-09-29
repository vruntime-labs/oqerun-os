import type {
  CloudProvider,
  CloudProviderStatus
} from "./CloudProvider";

const CONNECT_WINDOW_NAME =
  "oqerun-google-drive-connect";

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

  async disconnect(): Promise<void> {
    /*
     * Provider disconnect/revocation will be handled by
     * the server-side cloud session once durable storage
     * is connected.
     */
  }

  private get connectUrl(): string {
    const backend =
      (
        import.meta.env
          .VITE_OQERUN_CLOUD_API_URL ||
        ""
      ).trim();

    if (!backend) {
      return "";
    }

    return new URL(
      "/api/cloud/google/connect",
      backend.endsWith("/")
        ? backend
        : `${backend}/`
    ).toString();
  }
}
