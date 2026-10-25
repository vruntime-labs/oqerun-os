import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import { InstallationBridge, type InstallationRequest } from "../core/InstallationBridge";

export class Store {
  private readonly bridge: InstallationBridge;
  private readonly url = "https://vruntime-labs.github.io/oqerun-store/";

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {
    this.bridge = new InstallationBridge(
      async (request: InstallationRequest) => {
        // Native package handling is intentionally blocked until the OS can download,
        // hash-verify, safely extract, and register the actual .oqpkg bytes. Merely
        // recording a manifest is not a native package installation.
        if (request.type === "oqpkg") {
          throw new Error("Native .oqpkg installation is not available yet. The package has not been downloaded or verified.");
        }

        const permissionSummary = request.permissions.length
          ? request.permissions.map(permission => "• " + permission).join("\n")
          : "No permissions were declared.";
        const accepted = window.confirm(
          "Install " + request.name + " v" + request.version + "?\n\n" +
          "Publisher-provided permissions:\n" + permissionSummary +
          "\n\nOqerun records these permissions as metadata. This version does not enforce app sandbox permissions at runtime."
        );
        if (!accepted) throw new Error("Installation cancelled by the user.");

        const installed = await this.kernel.applications.install({
          id: request.appId,
          name: request.name,
          version: request.version,
          type: request.type,
          sourceUrl: request.sourceUrl,
          iconUrl: request.iconUrl,
          sha256: request.sha256,
          permissions: request.permissions,
          fileAssociations: request.fileAssociations
        });

        this.kernel.notify.success(
          "Oqerun Store",
          installed.name + " was added to Oqerun. Web apps still open from their published website."
        );

        window.dispatchEvent(
          new CustomEvent("oqerun-app-installed")
        );
      }
    );
  }

  open(): void {
    const windowId = "oqerun-store";

    const desktop = document.querySelector<HTMLElement>(".desktop-area");
    const desktopRect = desktop?.getBoundingClientRect();

    const availableWidth = desktopRect?.width ?? window.innerWidth;
    const availableHeight = desktopRect?.height ?? window.innerHeight;

    const width = Math.max(760, Math.min(1120, availableWidth - 24));
    const height = Math.max(520, Math.min(720, availableHeight - 24));
    const x = Math.max(12, Math.round((availableWidth - width) / 2));
    const y = Math.max(12, Math.round((availableHeight - height) / 2));

    this.wm.open({
      id: windowId,
      title: "Oqerun Store",
      width,
      height,
      x,
      y,
      content: `
        <div class="store-app-shell">
          <iframe
            class="store-app-frame"
            src="${this.url}"
            title="Oqerun Store"
            loading="eager"
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
          <div class="store-app-fallback" hidden>
            <span>Oqerun Store could not be loaded inside Oqerun.</span>
            <a href="${this.url}" target="_blank" rel="noopener noreferrer">Open Store</a>
          </div>
        </div>
      `
    });

    requestAnimationFrame(() => {
      const win = document.getElementById(windowId);
      if (!win) return;

      const frame = win.querySelector<HTMLIFrameElement>(".store-app-frame");
      const fallback = win.querySelector<HTMLElement>(".store-app-fallback");

      frame?.addEventListener("error", () => {
        if (fallback) fallback.hidden = false;
        this.kernel.notify.warning(
          "Oqerun Store",
          "The Store could not be embedded. You can open it directly."
        );
      });
    });
  }
}
