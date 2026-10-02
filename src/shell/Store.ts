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
        const installed = await this.kernel.applications.install({
          id: request.appId,
          name: request.name,
          version: request.version,
          type: request.type,
          sourceUrl: request.sourceUrl,
          iconUrl: request.iconUrl,
          permissions: request.permissions,
          fileAssociations: request.fileAssociations
        });

        this.kernel.notify.success(
          "Oqerun Store",
          installed.name + " was installed successfully."
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
