import { Kernel } from "../core/Kernel";
import { Explorer } from "./Explorer";
import { LocalExplorer, pickLocalDirectory } from "./LocalExplorer";
import { WindowManager } from "../window/WindowManager";
import { CloudManager } from "../cloud/CloudManager";

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

            <button class="computer-card" data-action="oqdrive" type="button">
              <div class="computer-icon">🖴</div>
              <h3>Oqerun Drive</h3>
              <p>Open Oqerun's local virtual drive.</p>
            </button>

            <button class="computer-card" data-action="google-drive" type="button">
              <div class="computer-icon">☁️</div>
              <h3>Google Drive</h3>
              <p>Browse the files and folders in your connected Google Drive.</p>
            </button>

            <button class="computer-card" data-action="onedrive" type="button">
              <div class="computer-icon">☁️</div>
              <h3>OneDrive</h3>
              <p>Connect and browse Microsoft OneDrive.</p>
            </button>

            <button class="computer-card" data-action="dropbox" type="button">
              <div class="computer-icon">☁️</div>
              <h3>Dropbox</h3>
              <p>Connect and browse Dropbox.</p>
            </button>

            <button class="computer-card" data-action="real" type="button">
              <div class="computer-icon">💻</div>
              <h3>This Computer</h3>
              <p>Browse a folder from your device with explicit permission.</p>
            </button>

            <button class="computer-card" data-action="cloud" type="button">
              <div class="computer-icon">☁️</div>
              <h3>Connected Cloud</h3>
              <p>Connect Google Drive now; more providers can use the same storage layer later.</p>
            </button>

          </div>

        </div>
      `
    });

    requestAnimationFrame(() => {
      const win = document.getElementById(windowId);
      if (!win) return;

      win.querySelector<HTMLElement>('[data-action="oqdrive"]')
        ?.addEventListener("dblclick", () => {
          void new Explorer(this.kernel, this.wm).open("/home/user");
        });

      win.querySelector<HTMLElement>('[data-action="google-drive"]')
        ?.addEventListener("dblclick", () => {
          void new Explorer(this.kernel, this.wm).open(
            "/mnt/cloud/google-drive"
          );
        });

      win.querySelector<HTMLElement>('[data-action="google-drive"]')
        ?.addEventListener("click", () => {
          void new Explorer(this.kernel, this.wm).open(
            "/mnt/cloud/google-drive"
          );
        });

      win.querySelector<HTMLElement>('[data-action="onedrive"]')
        ?.addEventListener("click", () => {
          new CloudManager(this.kernel, this.wm).open();
        });

      win.querySelector<HTMLElement>('[data-action="dropbox"]')
        ?.addEventListener("click", () => {
          new CloudManager(this.kernel, this.wm).open();
        });

      win.querySelector<HTMLElement>('[data-action="real"]')
        ?.addEventListener("dblclick", () => {
          void this.openLocalComputer();
        });

      win.querySelector<HTMLElement>('[data-action="cloud"]')
        ?.addEventListener("click", () => {
          new CloudManager(
            this.kernel,
            this.wm
          ).open();
        });
    });
  }

  private async openLocalComputer(): Promise<void> {
    try {
      const directory =
        await pickLocalDirectory();

      if (!directory) {
        const pickerAvailable =
          "showDirectoryPicker" in window;

        if (!pickerAvailable) {
          this.kernel.notify.warning(
            "This Computer",
            "This browser does not expose the File System Access directory picker."
          );
        }

        return;
      }

      await new LocalExplorer(
        this.kernel,
        this.wm
      ).open(directory);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The selected folder could not be opened.";

      this.kernel.notify.error(
        "This Computer",
        message
      );
    }
  }
}
