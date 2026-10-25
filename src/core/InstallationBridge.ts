import type { InstalledApplication } from "./ApplicationManager";

export interface InstallationRequest {
  requestId: string;
  appId: string;
  name: string;
  version: string;
  type: InstalledApplication["type"];
  sourceUrl?: string;
  iconUrl?: string;
  sha256?: string;
  permissions: string[];
  fileAssociations: string[];
}

const STORE_ORIGIN = "https://vruntime-labs.github.io";
const APP_TYPES = new Set(["oqpkg", "pwa", "web", "wasm", "external"]);

function boundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength && value.trim() === value;
}

function validHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseInstallationRequest(value: unknown): InstallationRequest | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;

  if (!boundedString(data.requestId, 100) || !/^oq-install-[a-z0-9-]{8,90}$/i.test(data.requestId)) return null;
  if (!boundedString(data.appId, 128) || !/^[a-z0-9._-]+$/i.test(data.appId)) return null;
  if (!boundedString(data.name, 100) || !boundedString(data.version, 80)) return null;
  if (typeof data.type !== "string" || !APP_TYPES.has(data.type)) return null;
  if (data.sourceUrl !== undefined && data.sourceUrl !== "" && !validHttpsUrl(data.sourceUrl)) return null;
  if (data.sha256 !== undefined && data.sha256 !== "" && (typeof data.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(data.sha256))) return null;

  // Icon metadata may be a short glyph (for example "W") or a secure URL.
  if (data.iconUrl !== undefined) {
    if (typeof data.iconUrl !== "string" || data.iconUrl.length > 2048) return null;
    if (/^https?:/i.test(data.iconUrl) && !validHttpsUrl(data.iconUrl)) return null;
    if (/[<>\u0000-\u001f]/.test(data.iconUrl)) return null;
  }

  if (!Array.isArray(data.permissions) || data.permissions.length > 50 ||
      data.permissions.some(item => typeof item !== "string" || item.length > 64)) return null;
  if (!Array.isArray(data.fileAssociations) || data.fileAssociations.length > 50 ||
      data.fileAssociations.some(item => typeof item !== "string" || !/^\.[a-z0-9]{1,12}$/i.test(item))) return null;

  return {
    requestId: data.requestId,
    appId: data.appId,
    name: data.name,
    version: data.version,
    type: data.type as InstalledApplication["type"],
    sourceUrl: typeof data.sourceUrl === "string" ? data.sourceUrl : undefined,
    iconUrl: typeof data.iconUrl === "string" ? data.iconUrl : undefined,
    sha256: typeof data.sha256 === "string" ? data.sha256 : undefined,
    permissions: [...data.permissions] as string[],
    fileAssociations: [...data.fileAssociations] as string[]
  };
}

export class InstallationBridge {
  constructor(private readonly install: (request: InstallationRequest) => Promise<void>) {
    window.addEventListener("message", this.onMessage);
  }

  dispose(): void {
    window.removeEventListener("message", this.onMessage);
  }

  private trustedStoreWindow(source: MessageEventSource | null): Window | null {
    const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>(".store-app-frame"));
    return frames.find(frame => frame.contentWindow === source)?.contentWindow ?? null;
  }

  private onMessage = (event: MessageEvent): void => {
    if (event.origin !== STORE_ORIGIN) return;
    const trustedWindow = this.trustedStoreWindow(event.source);
    if (!trustedWindow || event.source !== trustedWindow) return;

    const data = event.data as { type?: unknown; requestId?: unknown; apiVersion?: unknown };
    if (!data || typeof data !== "object") return;

    if (data.type === "oqerun-installation-probe") {
      trustedWindow.postMessage(
        { type: "oqerun-installation-ready", apiVersion: "1.0" },
        STORE_ORIGIN
      );
      return;
    }

    if (data.type !== "oqerun-installation-request") return;
    const request = parseInstallationRequest(event.data);
    if (!request) {
      trustedWindow.postMessage(
        { type: "oqerun-installation-response", requestId: typeof data.requestId === "string" ? data.requestId : "", result: "error", error: "Invalid installation request." },
        STORE_ORIGIN
      );
      return;
    }

    void (async () => {
      try {
        await this.install(request);
        trustedWindow.postMessage(
          { type: "oqerun-installation-response", requestId: request.requestId, result: "ok" },
          STORE_ORIGIN
        );
      } catch {
        trustedWindow.postMessage(
          { type: "oqerun-installation-response", requestId: request.requestId, result: "error", error: "Installation failed. Please retry." },
          STORE_ORIGIN
        );
      }
    })();
  };
}
