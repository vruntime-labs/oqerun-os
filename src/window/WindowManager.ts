import { OqWindow, WindowOptions } from "./Window";

export class WindowManager {
  private windows = new Map<string, OqWindow>();
  private zIndex = 100;

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

    const win = new OqWindow(options);
    const element = win.render();

    win.focus(++this.zIndex);

    element.addEventListener("pointerdown", () => {
      this.focus(options.id);
    });

    desktop.appendChild(element);
    this.windows.set(options.id, win);
  }

  focus(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;

    win.focus(++this.zIndex);
  }

  close(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;

    win.close();
    this.windows.delete(id);
  }

  exists(id: string): boolean {
    return this.windows.has(id);
  }
}
