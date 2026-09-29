import type {
  CloudProvider,
  CloudProviderStatus
} from "./CloudProvider";

export class OneDriveProvider
  implements CloudProvider
{
  readonly id = "one-drive";
  readonly name = "OneDrive";
  readonly description =
    "Access files stored in your Microsoft OneDrive.";

  get status(): CloudProviderStatus {
    return import.meta.env.VITE_MICROSOFT_CLIENT_ID
      ? "available"
      : "configuration-required";
  }

  async connect(): Promise<void> {
    if (!import.meta.env.VITE_MICROSOFT_CLIENT_ID) {
      throw new Error(
        "OneDrive needs a Microsoft Entra application client ID before it can connect."
      );
    }

    throw new Error(
      "OneDrive authentication is not enabled in this build yet."
    );
  }

  async disconnect(): Promise<void> {
    // Provider disconnect will be implemented with the MSAL session.
  }
}
