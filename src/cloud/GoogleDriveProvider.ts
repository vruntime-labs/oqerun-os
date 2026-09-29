import type {
  CloudProvider,
  CloudProviderStatus
} from "./CloudProvider";

export class GoogleDriveProvider
  implements CloudProvider
{
  readonly id = "google-drive";
  readonly name = "Google Drive";
  readonly description =
    "Access files stored in your Google Drive.";

  get status(): CloudProviderStatus {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID
      ? "available"
      : "configuration-required";
  }

  async connect(): Promise<void> {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      throw new Error(
        "Google Drive needs a web OAuth client ID before it can connect."
      );
    }

    throw new Error(
      "Google Drive OAuth is not enabled in this build yet."
    );
  }

  async disconnect(): Promise<void> {
    // Provider disconnect will be implemented with the OAuth session.
  }
}
