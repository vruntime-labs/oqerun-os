import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

export class Store {
  private readonly url = "https://vruntime-labs.github.io/oqerun-store/";

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  open(): void {
    const windowId = "oqerun-store";

    this.wm.open({
      id: windowId,
      title: "Oqerun Store",
      width: 1080,
      height: 680,
      x: 70,
      y: 35,
      content: \`
        <div class="store-app-shell">
          <iframe
            class="store-app-frame"
            src="\${this.url}"
            title="Oqerun Store"
            loading="eager"
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
          <div class="store-app-fallback" hidden>
            <span>Oqerun Store could not be loaded inside Oqerun.</span>
            <a href="\${this.url}" target="_blank" rel="noopener noreferrer">Open Store</a>
          </div>
        </div>
      \`
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
