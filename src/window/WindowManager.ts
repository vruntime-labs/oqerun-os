import { OqWindow, WindowOptions } from "./Window";
import { ProcessManager } from "../process/ProcessManager";

export class WindowManager {
  private windows = new Map<string, { window: OqWindow; pid: number }>();
  private zIndex = 100;
  private processManager = new ProcessManager();

  private getDesktopArea(): HTMLElement | null {
    return document.querySelector(".desktop-area");
  }

  open(options: WindowOptions): void {
    if (this.windows.has(options.id)) {
      this.focus(options.id);
      return;
    }

    const desktop = this.getDesktopArea();
    if (!desktop) return;

    const pid = this.processManager.create(options.title);

    const win = new OqWindow(options);
    const element = win.render();

    win.focus(++this.zIndex);

    // Focus window
    element.addEventListener("pointerdown", () => this.focus(options.id));

    // Close button
    const closeBtn = element.querySelector(".win-close");
    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.close(options.id);
    });

    desktop.appendChild(element);

    this.windows.set(options.id, { window: win, pid });
  }

  focus(id: string): void {
    const entry = this.windows.get(id);
    if (!entry) return;
    entry.window.focus(++this.zIndex);
  }

  close(id: string): void {
    const entry = this.windows.get(id);
    if (!entry) return;

    entry.window.close();
    this.processManager.kill(entry.pid);
    this.windows.delete(id);
  }

  listProcesses() {
    return this.processManager.list();
  }
}
