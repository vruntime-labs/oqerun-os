import { Kernel } from "../core/Kernel";
import { Explorer } from "./Explorer";
import { WindowManager } from "../window/WindowManager";

export class Computer {
  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  open(): void {
    const windowId = "computer";

    this.wm.open({
      id: windowId,
      title: "Computer",
      width: 760,
      height: 500,
      x: 90,
      y: 50,
      content: `
        <div class="computer-app">

          <div class="computer-header">
            <h2>Computer</h2>
            <p>Storage & Connected Devices</p>
          </div>

          <div class="computer-grid">

            <div class="computer-card" data-action="oqdrive">
              <div class="computer-icon">🖴</div>
              <h3>Oqerun Drive</h3>
              <p>Local storage</p>
            </div>

            <div class="computer-card" data-action="real">
              <div class="computer-icon">💻</div>
              <h3>This Computer</h3>
              <p>Real folders</p>
            </div>

            <div class="computer-card" data-action="cloud">
              <div class="computer-icon">☁️</div>
              <h3>Connected Cloud</h3>
              <p>Google Drive, OneDrive & more</p>
            </div>

          </div>

        </div>
      `
    });

    requestAnimationFrame(() => {
      const win = document.getElementById(windowId);
      if (!win) return;

      win.querySelector<HTMLElement>('[data-action="oqdrive"]')
        ?.addEventListener("dblclick", () => {
          new Explorer(this.kernel, this.wm).open("/home/user");
        });

      win.querySelector<HTMLElement>('[data-action="real"]')
        ?.addEventListener("dblclick", async () => {
          try {
            await (window as any).showDirectoryPicker();
            alert("Real folder support will be connected next.");
          } catch {}
        });

      win.querySelector<HTMLElement>('[data-action="cloud"]')
        ?.addEventListener("dblclick", () => {
          alert("Connected Cloud is coming soon.");
        });
    });
  }
}
