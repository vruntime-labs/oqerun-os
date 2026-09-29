import { Window } from "./Window";

export interface WindowOptions {
  id: string;
  title: string;
  content: string;

  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

interface ManagedWindow {
  id: string;
  instance: Window;
  minimized: boolean;
  maximized: boolean;
}

export class WindowManager {

  private windows =
    new Map<string, ManagedWindow>();

  private activeWindow:
    string | null = null;

  private zIndex = 100;

  open(
    options: WindowOptions
  ): void {

    const existing =
      this.windows.get(options.id);

    /*
     * If the application is already open,
     * restore and focus it instead of
     * creating another copy.
     */
    if (existing) {

      if (existing.minimized) {
        this.restore(options.id);
      }

      this.focus(options.id);

      return;
    }

    const win =
      new Window({
        ...options,

        onClose: () =>
          this.close(options.id),

        onMinimize: () =>
          this.minimize(options.id),

        onMaximize: () =>
          this.toggleMaximize(
            options.id
          ),

        onFocus: () =>
          this.focus(options.id)
      });

    win.render();

    this.windows.set(
      options.id,
      {
        id: options.id,
        instance: win,
        minimized: false,
        maximized: false
      }
    );

    this.focus(options.id);

    this.updateTaskbar();
  }

  close(
    id: string
  ): void {

    const managed =
      this.windows.get(id);

    if (!managed) return;

    managed.instance.destroy();

    this.windows.delete(id);

    if (
      this.activeWindow === id
    ) {
      this.activeWindow = null;

      this.activateNextWindow();
    }

    this.updateTaskbar();
  }

  minimize(
    id: string
  ): void {

    const managed =
      this.windows.get(id);

    if (
      !managed ||
      managed.minimized
    ) {
      return;
    }

    managed.instance.hide();

    managed.minimized = true;

    if (
      this.activeWindow === id
    ) {
      this.activeWindow = null;

      this.activateNextWindow();
    }

    this.updateTaskbar();
  }

  restore(
    id: string
  ): void {

    const managed =
      this.windows.get(id);

    if (!managed) return;

    managed.instance.show();

    managed.minimized = false;

    this.focus(id);

    this.updateTaskbar();
  }

  toggleMaximize(
    id: string
  ): void {

    const managed =
      this.windows.get(id);

    if (!managed) return;

    managed.maximized =
      !managed.maximized;

    if (managed.maximized) {

      managed.instance.maximize();

    } else {

      managed.instance.restore();
    }

    this.focus(id);

    this.updateTaskbar();
  }

  focus(
    id: string
  ): void {

    const managed =
      this.windows.get(id);

    if (!managed) return;

    if (managed.minimized) {
      this.restore(id);
      return;
    }

    this.activeWindow = id;

    this.zIndex++;

    managed.instance.setZIndex(
      this.zIndex
    );

    this.windows.forEach(
      (window) => {

        window.instance.setActive(
          window.id === id
        );
      }
    );

    this.updateTaskbar();
  }

  toggleFromTaskbar(
    id: string
  ): void {

    const managed =
      this.windows.get(id);

    if (!managed) return;

    if (managed.minimized) {

      this.restore(id);

      return;
    }

    if (
      this.activeWindow === id
    ) {

      this.minimize(id);

      return;
    }

    this.focus(id);
  }

  private activateNextWindow(): void {

    const visible =
      [...this.windows.values()]
        .filter(
          (window) =>
            !window.minimized
        );

    if (
      visible.length === 0
    ) {
      this.updateTaskbar();
      return;
    }

    const next =
      visible[visible.length - 1];

    this.focus(next.id);
  }

  private updateTaskbar(): void {

    const container =
      document.getElementById(
        "taskbar-apps"
      );

    if (!container) return;

    container.innerHTML = "";

    this.windows.forEach(
      (managed) => {

        const button =
          document.createElement(
            "button"
          );

        button.type = "button";

        button.className =
          "taskbar-app";

        if (
          this.activeWindow ===
          managed.id
        ) {

          button.classList.add(
            "active"
          );
        }

        if (
          managed.minimized
        ) {

          button.classList.add(
            "minimized"
          );
        }

        const base =
          import.meta.env.BASE_URL;

        const iconMap: Record<string, string> = {
          computer: "icons/computer.png",
          explorer: "icons/explorer.png",
          terminal: "icons/terminal.png",
          settings: "icons/settings.png",
          "computer-files": "icons/computer.png"
        };

        const iconPath =
          managed.id.startsWith("file-viewer-")
            ? "icons/explorer.png"
            : iconMap[managed.id] ?? "branding/icon-flat-1024.png";

        const icon =
          document.createElement("img");

        icon.className = "taskbar-icon";
        icon.src = `${base}${iconPath}`;
        icon.alt = "";
        icon.draggable = false;

        button.appendChild(icon);

        button.title =
          managed.instance.getTitle();

        button.setAttribute(
          "aria-label",
          managed.instance.getTitle()
        );

        button.addEventListener(
          "click",
          () =>
            this.toggleFromTaskbar(
              managed.id
            )
        );

        container.appendChild(
          button
        );
      }
    );
  }

  getWindows(): string[] {

    return [
      ...this.windows.keys()
    ];
  }

  getActiveWindow():
    string | null {

    return this.activeWindow;
  }
}
