import type {
  CloudProvider,
  CloudProviderStatus
} from "./CloudProvider";

type UnifiedCloudCallbacks = {
  onConfigurationRequired?: () => void;
  onConnectionStarted?: () => void;
};

const CONNECT_WINDOW_NAME =
  "oqerun-cloud-connect";

export class UnifiedCloudProvider
  implements CloudProvider
{
  readonly id = "unified-cloud";
  readonly name = "Unified Cloud";
  readonly description =
    "Secure, provider-agnostic cloud storage connection.";

  constructor(
    private readonly callbacks: UnifiedCloudCallbacks = {}
  ) {}

  get status(): CloudProviderStatus {
    return this.connectUrl
      ? "available"
      : "configuration-required";
  }

  async connect(): Promise<void> {
    if (!this.connectUrl) {
      this.callbacks.onConfigurationRequired?.();
      throw new Error(
        "Secure cloud connection is not configured yet. Oqerun will not ask users to paste cloud passwords, OAuth secrets, or access tokens."
      );
    }

    const popup =
      window.open(
        this.connectUrl,
        CONNECT_WINDOW_NAME,
        "popup,width=980,height=760,resizable=yes,scrollbars=yes"
      );

    if (!popup) {
      throw new Error(
        "The secure cloud connection window was blocked. Allow pop-ups for Oqerun and try again."
      );
    }

    popup.focus();
    this.callbacks.onConnectionStarted?.();
  }

  async disconnect(): Promise<void> {
    /*
     * Disconnect/revoke is handled by the secure cloud backend.
     * The browser never receives provider secrets.
     */
  }

  private get connectUrl(): string {
    return (
      import.meta.env
        .VITE_OQERUN_CLOUD_CONNECT_URL ||
      ""
    ).trim();
  }
}
