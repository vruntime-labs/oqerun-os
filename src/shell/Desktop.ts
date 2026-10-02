import { StartMenu } from "./StartMenu";
import { Explorer } from "./Explorer";
import { Computer } from "./Computer";
import { Terminal } from "./Terminal";
import { Settings } from "./Settings";
import { Store } from "./Store";

import { WindowManager } from "../window/WindowManager";
import { Kernel } from "../core/Kernel";

export class Desktop {
  private startMenu = new StartMenu();
  private wm = new WindowManager();

  private explorer: Explorer;
  private computer: Computer;
  private terminal: Terminal;
  private settings: Settings;
  private store: Store;

  private readonly pinnedStorageKey = "oqerun.pinnedApps";
  private readonly homeStorageKey = "oqerun.homeApps";

  constructor(private kernel: Kernel) {
    this.explorer = new Explorer(this.kernel, this.wm);
    this.computer = new Computer(this.kernel, this.wm);
    this.terminal = new Terminal(this.kernel, this.wm);
    this.settings = new Settings(this.kernel, this.wm);
    this.store = new Store(this.kernel, this.wm);
  }

  render(): void {
    const app = document.getElementById("app");

    if (!app) {
      console.error("Oqerun OS: #app element not found.");
      return;
    }

    const base = import.meta.env.BASE_URL;

    if (
      !app.classList.contains("theme-system") &&
      !app.classList.contains("theme-dark") &&
      !app.classList.contains("theme-light")
    ) {
      app.classList.add("theme-system");
    }

    app.innerHTML = `
      <div class="desktop">
        <div class="desktop-area">
          <div
            class="desktop-icon"
            id="store-icon"
            tabindex="0"
            role="button"
            aria-label="Oqerun Store"
          >
            <img
              class="desktop-icon-image"
              src="${base}icons/oqerun-store.svg"
              alt="Oqerun Store"
              draggable="false"
            />
            <span>Oqerun Store</span>
          </div>

          <div
            class="desktop-icon"
            id="computer-icon"
            tabindex="0"
            role="button"
            aria-label="Computer"
          >
            <img
              class="desktop-icon-image"
              src="${base}icons/computer.png"
              alt="Computer"
              draggable="false"
            />
            <span>Computer</span>
          </div>
        </div>

        <div
          id="start-menu"
          class="start-menu"
          style="display:none;"
        >
          <div class="start-menu-header">
            <div class="start-menu-brand">
              <div class="start-menu-brand-mark">O</div>
              <div>
                <h3>Oqerun</h3>
                <span>Applications</span>
              </div>
            </div>

            <button
              id="start-menu-close"
              class="start-menu-close"
              type="button"
              aria-label="Close Applications"
            >×</button>
          </div>

          <div class="start-menu-search">
            <span>⌕</span>
            <input
              id="app-search"
              type="search"
              placeholder="Search applications"
              autocomplete="off"
              spellcheck="false"
            />
          </div>

          <div class="start-menu-apps-header">
            <span>All Applications</span>
            <span id="app-count"></span>
          </div>

          <div id="app-list" class="launchpad-grid"></div>

          <div class="start-menu-footer">
            <span>Oqerun OS</span>
            <span>Launchpad</span>
          </div>
        </div>

        <footer class="taskbar">
          <button
            id="start-btn"
            class="start-btn"
            type="button"
            aria-label="Open Start Menu"
          >
            <img
              src="${base}branding/start-orb.png"
              alt="Oqerun"
              draggable="false"
            />
          </button>

          <div class="taskbar-left" id="taskbar-pinned">
            <button
              id="taskbar-computer"
              class="taskbar-dock-app pinned"
              type="button"
              title="Computer"
              aria-label="Computer"
            >
              <img src="${base}icons/computer.png" alt="" draggable="false" />
            </button>

            <button
              id="taskbar-explorer"
              class="taskbar-dock-app pinned"
              type="button"
              title="Explorer"
              aria-label="Explorer"
            >
              <img src="${base}icons/explorer.png" alt="" draggable="false" />
            </button>

            <button
              id="taskbar-store"
              class="taskbar-dock-app pinned"
              type="button"
              title="Oqerun Store"
              aria-label="Oqerun Store"
            >
              <img src="${base}icons/oqerun-store.svg" alt="" draggable="false" />
            </button>
          </div>

          <div class="taskbar-divider" aria-hidden="true"></div>

          <div id="taskbar-apps"></div>

          <div class="taskbar-divider taskbar-divider-right" aria-hidden="true"></div>

          <div class="taskbar-right">
            <span class="taskbar-status" title="Oqerun OS">●</span>
            <div id="clock">--:--</div>
          </div>
        </footer>
      </div>
    `;

    this.bindEvents();

    void this.renderAppList();
    this.renderPersonalization();
    this.bindContextMenus();

    this.startClock();
  }

  private hideStartMenu(): void {
    this.startMenu.close();
  }

  private bindEvents(): void {
    document
      .getElementById("taskbar-computer")
      ?.addEventListener("click", () => this.computer.open());

    document
      .getElementById("taskbar-explorer")
      ?.addEventListener("click", () => this.explorer.open("/home/user"));

    document
      .getElementById("taskbar-store")
      ?.addEventListener("click", () => this.store.open());

    document
      .getElementById("start-btn")
      ?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.startMenu.toggle();
      });

    document
      .getElementById("start-menu-close")
      ?.addEventListener("click", () => {
        this.hideStartMenu();
      });

    document
      .getElementById("app-search")
      ?.addEventListener("input", (event) => {
        const input = event.target as HTMLInputElement;
        const query = input.value.trim().toLocaleLowerCase();
        const items = document.querySelectorAll<HTMLElement>(".start-menu-item");
        let visible = 0;

        for (const item of items) {
          const match = !query || item.dataset.appName?.includes(query);
          item.hidden = !match;
          if (match) visible++;
        }

        const empty = document.getElementById("app-search-empty");
        if (empty) empty.hidden = visible !== 0;
      });

    document
      .getElementById("computer-icon")
      ?.addEventListener("dblclick", () => {
        this.computer.open();
      });

    document
      .getElementById("computer-icon")
      ?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.computer.open();
        }
      });

    document
      .getElementById("store-icon")
      ?.addEventListener("dblclick", () => {
        this.store.open();
      });

    document
      .getElementById("store-icon")
      ?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.store.open();
        }
      });

    window.addEventListener("oqerun-app-installed", () => {
      void this.renderAppList();
    });

    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      if (
        !target.closest("#start-menu") &&
        !target.closest("#start-btn")
      ) {
        this.hideStartMenu();
      }
    });
  }

  private async renderAppList(): Promise<void> {
    const container = document.getElementById("app-list");
    if (!container) return;

    const installed = await this.kernel.applications.list();

    type StartApp = {
      id: string;
      name: string;
      icon: string;
      iconUrl?: string;
      open: () => void;
    };

    const apps: StartApp[] = [
      {
        id: "computer",
        name: "Computer",
        icon: "🖥️",
        iconUrl: `${import.meta.env.BASE_URL}icons/computer.png`,
        open: () => this.computer.open()
      },
      {
        id: "explorer",
        name: "Explorer",
        icon: "📁",
        iconUrl: `${import.meta.env.BASE_URL}icons/explorer.png`,
        open: () => this.explorer.open("/home/user")
      },
      {
        id: "oqerun-store",
        name: "Oqerun Store",
        icon: "▣",
        iconUrl: `${import.meta.env.BASE_URL}icons/oqerun-store.svg`,
        open: () => this.store.open()
      },
      {
        id: "settings",
        name: "Settings",
        icon: "⚙",
        iconUrl: `${import.meta.env.BASE_URL}icons/settings.png`,
        open: () => this.settings.open()
      },
      {
        id: "terminal",
        name: "Terminal",
        icon: ">_",
        iconUrl: `${import.meta.env.BASE_URL}icons/terminal.png`,
        open: () => this.terminal.open()
      }
    ];

    for (const app of installed) {
      const windowId =
        "installed-app-" +
        app.id.replace(/[^a-zA-Z0-9_-]/g, "-");

      apps.push({
        id: app.id,
        name: app.name,
        icon: "▣",
        iconUrl: app.iconUrl,
        open: () => this.openInstalledApp(app, windowId)
      });
    }

    apps.sort((a, b) =>
      a.name.localeCompare(
        b.name,
        undefined,
        { sensitivity: "base" }
      )
    );

    container.innerHTML = "";

    const count = document.getElementById("app-count");
    if (count) {
      count.textContent = String(apps.length);
    }

    for (const app of apps) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "start-menu-item";
      button.title = app.name;
      button.dataset.appName = app.name.toLocaleLowerCase();

      if (app.iconUrl) {
        const icon = document.createElement("img");
        icon.className = "start-icon";
        icon.src = app.iconUrl;
        icon.alt = "";
        icon.draggable = false;
        icon.onerror = () => {
          icon.remove();
          const fallback = document.createElement("span");
          fallback.className = "start-icon start-icon-fallback";
          fallback.textContent = app.icon;
          button.prepend(fallback);
        };
        button.appendChild(icon);
      } else {
        const icon = document.createElement("span");
        icon.className = "start-icon start-icon-fallback";
        icon.textContent = app.icon;
        button.appendChild(icon);
      }

      const name = document.createElement("span");
      name.textContent = app.name;
      button.appendChild(name);

      button.addEventListener("click", () => {
        this.hideStartMenu();
        app.open();
      });

      container.appendChild(button);
    }

    const empty = document.createElement("div");
    empty.id = "app-search-empty";
    empty.className = "start-menu-empty";
    empty.hidden = true;
    empty.innerHTML = "<strong>No applications found</strong><span>Try another search.</span>";
    container.appendChild(empty);
  }

  private openInstalledApp(
    app: {
      id: string;
      name: string;
      sourceUrl?: string;
      iconUrl?: string;
    },
    windowId: string
  ): void {
    if (!app.sourceUrl) {
      this.kernel.notify.info(
        app.name,
        "This application does not have a launch URL yet."
      );
      return;
    }

    this.wm.open({
      id: windowId,
      title: app.name,
      iconUrl: app.iconUrl,
      width: 980,
      height: 640,
      x: 60,
      y: 35,
      content: `
        <div class="installed-app-shell">
          <iframe
            class="installed-app-frame"
            src="${this.escapeAttribute(app.sourceUrl)}"
            title="${this.escapeAttribute(app.name)}"
            loading="eager"
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>
      `
    });
  }

  private escapeAttribute(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("\"", "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }


  private getStoredIds(key: string): string[] {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? "[]");
      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }

  private setStoredIds(key: string, ids: string[]): void {
    localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  }

  private isPinned(id: string): boolean {
    return this.getStoredIds(this.pinnedStorageKey).includes(id);
  }

  private isOnHome(id: string): boolean {
    return this.getStoredIds(this.homeStorageKey).includes(id);
  }

  private togglePinned(id: string): void {
    const ids = this.getStoredIds(this.pinnedStorageKey);
    const next = ids.includes(id)
      ? ids.filter((item) => item !== id)
      : [...ids, id];

    this.setStoredIds(this.pinnedStorageKey, next);
    this.renderPersonalization();
  }

  private toggleHome(id: string): void {
    const ids = this.getStoredIds(this.homeStorageKey);
    const next = ids.includes(id)
      ? ids.filter((item) => item !== id)
      : [...ids, id];

    this.setStoredIds(this.homeStorageKey, next);
    void this.renderAppList();
    this.renderPersonalization();
  }

  private appDefinitions(): Array<{
    id: string;
    name: string;
    iconUrl?: string;
    open: () => void;
  }> {
    return [
      {
        id: "computer",
        name: "Computer",
        iconUrl: `${import.meta.env.BASE_URL}icons/computer.png`,
        open: () => this.computer.open()
      },
      {
        id: "explorer",
        name: "Explorer",
        iconUrl: `${import.meta.env.BASE_URL}icons/explorer.png`,
        open: () => this.explorer.open("/home/user")
      },
      {
        id: "oqerun-store",
        name: "Oqerun Store",
        iconUrl: `${import.meta.env.BASE_URL}icons/oqerun-store.svg`,
        open: () => this.store.open()
      },
      {
        id: "settings",
        name: "Settings",
        iconUrl: `${import.meta.env.BASE_URL}icons/settings.png`,
        open: () => this.settings.open()
      },
      {
        id: "terminal",
        name: "Terminal",
        iconUrl: `${import.meta.env.BASE_URL}icons/terminal.png`,
        open: () => this.terminal.open()
      }
    ];
  }

  private renderPersonalization(): void {
    const desktop = document.getElementById("desktop-area");
    const pinned = document.getElementById("taskbar-pinned");

    if (desktop) {
      desktop.querySelectorAll(".user-desktop-icon").forEach((node) => node.remove());
      const homeIds = new Set(this.getStoredIds(this.homeStorageKey));

      for (const app of this.appDefinitions()) {
        if (!homeIds.has(app.id)) continue;
        this.appendDesktopShortcut(desktop, app);
      }
    }

    if (pinned) {
      pinned.querySelectorAll(".user-pinned-app").forEach((node) => node.remove());
      const pinnedIds = this.getStoredIds(this.pinnedStorageKey);
      const definitions = this.appDefinitions();

      for (const id of pinnedIds) {
        const app = definitions.find((item) => item.id === id);
        if (!app) continue;
        this.appendPinnedShortcut(pinned, app);
      }
    }
  }

  private appendDesktopShortcut(
    desktop: HTMLElement,
    app: { id: string; name: string; iconUrl?: string; open: () => void }
  ): void {
    const icon = document.createElement("div");
    icon.className = "desktop-icon user-desktop-icon";
    icon.tabIndex = 0;
    icon.role = "button";
    icon.setAttribute("aria-label", app.name);

    const image = document.createElement("img");
    image.className = "desktop-icon-image";
    image.src = app.iconUrl ?? `${import.meta.env.BASE_URL}branding/icon-flat-1024.png`;
    image.alt = app.name;
    image.draggable = false;

    const label = document.createElement("span");
    label.textContent = app.name;

    icon.append(image, label);
    icon.addEventListener("dblclick", app.open);
    icon.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        app.open();
      }
    });
    icon.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.showAppContextMenu(event.clientX, event.clientY, app.id, app.name);
    });

    desktop.appendChild(icon);
  }

  private appendPinnedShortcut(
    container: HTMLElement,
    app: { id: string; name: string; iconUrl?: string; open: () => void }
  ): void {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "taskbar-dock-app user-pinned-app";
    button.title = app.name;
    button.setAttribute("aria-label", app.name);

    const image = document.createElement("img");
    image.src = app.iconUrl ?? `${import.meta.env.BASE_URL}branding/icon-flat-1024.png`;
    image.alt = "";
    image.draggable = false;

    button.appendChild(image);
    button.addEventListener("click", app.open);
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.showAppContextMenu(event.clientX, event.clientY, app.id, app.name);
    });

    container.appendChild(button);
  }

  private bindContextMenus(): void {
    for (const id of ["store-icon", "computer-icon"]) {
      document.getElementById(id)?.addEventListener("contextmenu", (event) => {
        event.preventDefault();

        const name = id === "store-icon" ? "Oqerun Store" : "Computer";
        const appId = id === "store-icon" ? "oqerun-store" : "computer";
        this.showAppContextMenu(event.clientX, event.clientY, appId, name);
      });
    }

    document.addEventListener("contextmenu", (event) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(".desktop-icon") ||
        target.closest(".taskbar") ||
        target.closest(".start-menu") ||
        target.closest(".window")
      ) {
        return;
      }

      event.preventDefault();
      this.showDesktopContextMenu(event.clientX, event.clientY);
    });
  }

  private showAppContextMenu(
    x: number,
    y: number,
    id: string,
    name: string
  ): void {
    this.removeContextMenu();

    const menu = document.createElement("div");
    menu.className = "oqerun-context-menu";
    menu.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - 230)}px`;

    const add = (label: string, action: () => void, disabled = false) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.disabled = disabled;
      button.addEventListener("click", () => {
        this.removeContextMenu();
        action();
      });
      menu.appendChild(button);
    };

    add(this.isPinned(id) ? "Unpin from Taskbar" : "Pin to Taskbar", () => this.togglePinned(id));
    add(this.isOnHome(id) ? "Remove from Home Screen" : "Add to Home Screen", () => this.toggleHome(id));
    add("Open", () => {
      const app = this.appDefinitions().find((item) => item.id === id);
      app?.open();
    });
    add("Properties", () => {
      this.kernel.notify.info(name, "Application shortcuts and installation settings are managed by Oqerun OS.");
    });

    document.body.appendChild(menu);
  }

  private showDesktopContextMenu(x: number, y: number): void {
    this.removeContextMenu();

    const menu = document.createElement("div");
    menu.className = "oqerun-context-menu";
    menu.style.left = `${Math.min(x, window.innerWidth - 220)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - 180)}px`;

    const add = (label: string, action: () => void) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => {
        this.removeContextMenu();
        action();
      });
      menu.appendChild(button);
    };

    add("Refresh", () => {
      void this.renderAppList();
      this.renderPersonalization();
    });
    add("Open Computer", () => this.computer.open());
    add("Open Settings", () => this.settings.open());

    document.body.appendChild(menu);
  }

  private removeContextMenu(): void {
    document.querySelector(".oqerun-context-menu")?.remove();
  }

  private startClock(): void {
    const clock = document.getElementById("clock");

    if (!clock) return;

    const update = (): void => {
      clock.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    update();
    setInterval(update, 1000);
  }
}
