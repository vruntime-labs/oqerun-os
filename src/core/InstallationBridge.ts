import type { InstalledApplication } from "./ApplicationManager";

export interface InstallationRequest {
  requestId: string;
  appId: string;
  name: string;
  version: string;
  type: InstalledApplication["type"];
  sourceUrl?: string;
  sha256?: string;
  permissions: string[];
  fileAssociations: string[];
}

const STORE_ORIGIN = "https://vruntime-labs.github.io";

export class InstallationBridge {
  private readonly pending = new Map<string, (result: { ok: boolean; error?: string }) => void>();

  constructor(private readonly install: (request: InstallationRequest) => Promise<void>) {
    window.addEventListener("message", this.onMessage);
  }

  dispose(): void {
    window.removeEventListener("message", this.onMessage);
    this.pending.clear();
  }

  private onMessage = (event: MessageEvent): void => {
    if (event.origin !== STORE_ORIGIN) return;

    const data = event.data as {
      type?: string;
      requestId?: string;
      result?: "ok" | "error";
      error?: string;
    };

    if (data?.type === "oqerun-installation-probe") {
      const frame = event.source as Window | null;
      frame?.postMessage(
        { type: "oqerun-installation-ready", apiVersion: "1.0" },
        event.origin
      );
      return;
    }

    if (data?.type !== "oqerun-installation-request" || !data.requestId) return;

    void (async () => {
      try {
        await this.install(event.data as InstallationRequest);
        (event.source as Window | null)?.postMessage(
          { type: "oqerun-installation-response", requestId: data.requestId, result: "ok" },
          event.origin
        );
      } catch (error) {
        (event.source as Window | null)?.postMessage(
          {
            type: "oqerun-installation-response",
            requestId: data.requestId,
            result: "error",
            error: error instanceof Error ? error.message : "Installation failed."
          },
          event.origin
        );
      }
    })();
  };
}
