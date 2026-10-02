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
  private installedApps = new Map<string, Awaited<ReturnType<Kernel["applications"]["list"]>>[number]>();

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
              placeholder="Search apps, files and settings"
              autocomplete="off"
              spellcheck="false"
            />
          </div>

          <div id="start-search-results" class="start-search-results" hidden></div>

          <div class="start-menu-quick-row">
            <section class="start-menu-quick-section">
              <div class="start-menu-section-head">
                <span>Pinned</span>
                <span>Quick access</span>
              </div>
              <div id="start-pinned" class="start-menu-pinned"></div>
            </section>

            <section class="start-menu-quick-section start-menu-recent-section">
              <div class="start-menu-section-head">
                <span>Recent</span>
                <span>Last opened</span>
              </div>
              <div id="start-recent" class="start-menu-recent"></div>
            </section>
          </div>

          <div class="start-menu-apps-header">
            <span>All Applications</span>
            <span id="app-count"></span>
          </div>

          <div id="app-list" class="launchpad-grid"></div>

          <div class="start-menu-footer">
            <button id="start-user" class="start-footer-action" type="button">
              <span class="start-footer-avatar">V</span>
              <span>User</span>
            </button>
            <div class="start-footer-actions">
              <button id="start-settings" class="start-footer-icon" type="button" title="Settings" aria-label="Settings">⚙</button>
              <button id="start-power" class="start-footer-icon" type="button" title="Power" aria-label="Power">⏻</button>
            </div>
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

          <button
            id="taskbar-search"
            class="taskbar-tool"
            type="button"
            title="Search"
            aria-label="Search Oqerun"
          >⌕</button>

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
            <button id="taskbar-network" class="taskbar-tray-button" type="button" title="Network: Online" aria-label="Network status">⌁</button>
            <button id="taskbar-volume" class="taskbar-tray-button" type="button" title="Volume" aria-label="Volume">◖</button>
            <span class="taskbar-status" title="Oqerun OS">●</span>
            <div class="taskbar-date" id="date">--/--</div>
            <div id="clock">--:--</div>
          </div>
        </footer>
      </div>
    `;

    this.bindEvents();
    this.applyTaskbarPreferences();

    void this.renderAppList();
    void this.renderPersonalization();
    this.bindContextMenus();

    this.startClock();
  }

  private applyTaskbarPreferences(): void {
    const desktop = document.querySelector(".desktop");
    if (!desktop) return;

    const position = localStorage.getItem("oqerun.taskbar.position") ?? "bottom";
    const compact = localStorage.getItem("oqerun.taskbar.compact") === "1";
    const autoHide = localStorage.getItem("oqerun.taskbar.autoHide") === "1";

    desktop.classList.toggle("taskbar-top", position === "top");
    desktop.classList.toggle("taskbar-bottom", position !== "top");
    desktop.classList.toggle("taskbar-compact", compact);
    desktop.classList.toggle("taskbar-auto-hide", autoHide);
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
      .getElementById("taskbar-search")
      ?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.startMenu.open();
        this.startMenu.focusSearch();
      });

    document
      .getElementById("start-settings")
      ?.addEventListener("click", () => {
        this.hideStartMenu();
        this.settings.open();
      });

    document
      .getElementById("start-user")
      ?.addEventListener("click", () => {
        this.kernel.notify.info("User Profile", "User profile management will be available in Oqerun Settings.");
      });

    document
      .getElementById("start-power")
      ?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.showPowerMenu();
      });

    document
      .getElementById("taskbar-network")
      ?.addEventListener("click", () => {
        this.kernel.notify.info(
          navigator.onLine ? "Network" : "Network",
          navigator.onLine ? "Oqerun is online." : "Oqerun is offline."
        );
      });

    document
      .getElementById("taskbar-volume")
      ?.addEventListener("click", () => {
        this.kernel.notify.info("Volume", "Audio controls are managed by the active Oqerun app.");
      });

    window.addEventListener("online", () => this.updateSystemTray());
    window.addEventListener("offline", () => this.updateSystemTray());

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
        this.filterQuickSections(query);
        void this.searchWorkspace(query);
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
      void this.renderPersonalization();
    });

    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      if (
        !target.closest("#start-menu") &&
        !target.closest("#start-btn")
      ) {
        this.hideStartMenu();
      }

      // Keep context-menu buttons clickable. The menu itself owns its
      // dismissal after an action is selected.
      if (!target.closest(".oqerun-context-menu")) {
        this.removeContextMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.removeContextMenu();
      }

      if ((event.ctrlKey || event.metaKey) && event.code === "Space") {
        event.preventDefault();
        this.startMenu.open();
        this.startMenu.focusSearch();
      }
    });
  }

  private async searchWorkspace(query: string): Promise<void> {
    const container = document.getElementById("start-search-results");
    if (!container) return;

    container.innerHTML = "";
    container.hidden = !query;

    if (!query) return;

    const matches: Array<{ name: string; path: string; kind: string }> = [];

    const walk = async (path: string, depth: number): Promise<void> => {
      if (depth > 4 || matches.length >= 40) return;

      let entries: Array<{ name: string; kind: string }> = [];
      try {
        entries = await this.kernel.sys.listDetailed(path);
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = Path.join(path, entry.name);
        if (entry.name.toLocaleLowerCase().includes(query)) {
          matches.push({ name: entry.name, path: fullPath, kind: entry.kind });
          if (matches.length >= 40) return;
        }

        if (entry.kind === "directory") {
          await walk(fullPath, depth + 1);
          if (matches.length >= 40) return;
        }
      }
    };

    await walk("/home/user", 0);

    const apps = [...this.installedApps.values()]
      .filter((app) => app.name.toLocaleLowerCase().includes(query))
      .slice(0, 8);

    if (!matches.length && !apps.length) {
      container.innerHTML = `
        <div class="start-search-empty">
          <strong>No results</strong>
          <span>Try an app, file, folder, or setting.</span>
        </div>
      `;
      return;
    }

    const title = document.createElement("div");
    title.className = "start-search-title";
    title.textContent = "Search Results";
    container.appendChild(title);

    for (const app of apps) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "start-search-result";
      button.innerHTML = `<span class="start-search-result-icon">▣</span><span><strong>${this.escapeHtml(app.name)}</strong><small>Installed application</small></span>`;
      button.addEventListener("click", () => {
        this.hideStartMenu();
        this.openInstalledApp(app, "installed-app-" + app.id.replace(/[^a-zA-Z0-9_-]/g, "-"));
      });
      container.appendChild(button);
    }

    for (const match of matches) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "start-search-result";
      button.innerHTML = `<span class="start-search-result-icon">${match.kind === "directory" ? "▰" : "▱"}</span><span><strong>${this.escapeHtml(match.name)}</strong><small>${this.escapeHtml(match.path)}</small></span>`;
      button.addEventListener("click", () => {
        this.hideStartMenu();
        this.explorer.open(match.kind === "directory" ? match.path : Path.dirname(match.path));
      });
      container.appendChild(button);
    }
  }

  private async renderAppList(): Promise<void> {
    const container = document.getElementById("app-list");
    if (!container) return;

    const installed = await this.kernel.applications.list();
    this.installedApps = new Map(installed.map((app) => [app.id, app]));

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

    this.renderQuickSections();

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
        this.recordRecentApp(app.id, app.name, app.iconUrl);
        this.renderRecentApps();
        this.hideStartMenu();
        app.open();
      });

      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.showAppContextMenu(
          event.clientX,
          event.clientY,
          app.id,
          app.name
        );
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
        "This application does not publish a launch URL. Open it from Oqerun Store to view its source or install information."
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


  private readonly recentStorageKey = "oqerun.recentApps";

  private getRecentApps(): Array<{ id: string; name: string; iconUrl?: string }> {
    try {
      const value = JSON.parse(localStorage.getItem(this.recentStorageKey) ?? "[]");
      return Array.isArray(value)
        ? value.filter((item): item is { id: string; name: string; iconUrl?: string } =>
            !!item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.name === "string"
          )
        : [];
    } catch {
      return [];
    }
  }

  private recordRecentApp(id: string, name: string, iconUrl?: string): void {
    const next = [
      { id, name, iconUrl },
      ...this.getRecentApps().filter((item) => item.id !== id)
    ].slice(0, 6);

    localStorage.setItem(this.recentStorageKey, JSON.stringify(next));
  }

  private renderQuickSections(): void {
    const pinnedContainer = document.getElementById("start-pinned");
    const pinnedIds = this.getStoredIds(this.pinnedStorageKey);
    const definitions = this.getAppCatalog();

    if (pinnedContainer) {
      pinnedContainer.innerHTML = "";
      const pinnedApps = definitions.filter((app) => pinnedIds.includes(app.id));

      if (pinnedApps.length === 0) {
        const empty = document.createElement("span");
        empty.className = "start-quick-empty";
        empty.textContent = "Pin apps from the desktop or taskbar menu.";
        pinnedContainer.appendChild(empty);
      } else {
        for (const app of pinnedApps.slice(0, 8)) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "start-quick-app";
          button.title = app.name;
          button.addEventListener("click", () => {
            this.recordRecentApp(app.id, app.name, app.iconUrl);
            this.renderRecentApps();
            this.hideStartMenu();
            app.open();
          });

          button.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.showAppContextMenu(
              event.clientX,
              event.clientY,
              app.id,
              app.name
            );
          });

          const img = document.createElement("img");
          img.src = app.iconUrl ?? `${import.meta.env.BASE_URL}branding/icon-flat-1024.png`;
          img.alt = "";
          img.draggable = false;
          button.appendChild(img);
          pinnedContainer.appendChild(button);
        }
      }
    }

    this.renderRecentApps();
  }

  private renderRecentApps(): void {
    const container = document.getElementById("start-recent");
    if (!container) return;

    container.innerHTML = "";
    const recent = this.getRecentApps();

    if (recent.length === 0) {
      const empty = document.createElement("span");
      empty.className = "start-quick-empty";
      empty.textContent = "Your recently opened apps will appear here.";
      container.appendChild(empty);
      return;
    }

    const definitions = this.getAppCatalog();

    for (const item of recent.slice(0, 4)) {
      const app = definitions.find((definition) => definition.id === item.id);
      if (!app) continue;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "start-recent-app";
      button.title = app.name;
      button.addEventListener("click", () => {
        this.recordRecentApp(app.id, app.name, app.iconUrl);
        this.renderRecentApps();
        this.hideStartMenu();
        app.open();
      });

      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.showAppContextMenu(
          event.clientX,
          event.clientY,
          app.id,
          app.name
        );
      });

      const img = document.createElement("img");
      img.src = app.iconUrl ?? `${import.meta.env.BASE_URL}branding/icon-flat-1024.png`;
      img.alt = "";
      img.draggable = false;
      button.appendChild(img);

      const name = document.createElement("span");
      name.textContent = app.name;
      button.appendChild(name);

      container.appendChild(button);
    }
  }

  private filterQuickSections(query: string): void {
    const sections = document.querySelectorAll<HTMLElement>(".start-quick-app, .start-recent-app");
    sections.forEach((item) => {
      item.hidden = !!query && !item.title.toLocaleLowerCase().includes(query);
    });
  }

  private showPowerMenu(): void {
    this.removeContextMenu();

    const menu = document.createElement("div");
    menu.className = "oqerun-context-menu oqerun-power-menu";

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

    add("Sleep Oqerun", () => {
      document.querySelector(".desktop")?.classList.add("oqerun-sleep");
      this.kernel.notify.info("Oqerun is sleeping", "Click the desktop to wake the session.");
      const wake = () => {
        document.querySelector(".desktop")?.classList.remove("oqerun-sleep");
        document.removeEventListener("click", wake);
      };
      setTimeout(() => document.addEventListener("click", wake, { once: true }), 100);
    });

    add("Restart Oqerun", () => window.location.reload());

    add("Lock Session", () => {
      document.querySelector(".desktop")?.classList.add("oqerun-locked");
      this.kernel.notify.info("Session locked", "Reload the page to unlock this Oqerun session.");
    });

    document.body.appendChild(menu);
  }

  private updateSystemTray(): void {
    const network = document.getElementById("taskbar-network");
    if (!network) return;

    const online = navigator.onLine;
    network.textContent = online ? "⌁" : "×";
    network.title = online ? "Network: Online" : "Network: Offline";
    network.setAttribute("aria-label", network.title);

    const date = document.getElementById("date");
    if (date) {
      date.textContent = new Date().toLocaleDateString([], {
        day: "2-digit",
        month: "short"
      });
    }
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

  private getAppCatalog(): Array<{
    id: string;
    name: string;
    iconUrl?: string;
    open: () => void;
  }> {
    const definitions = this.appDefinitions();

    for (const app of this.installedApps.values()) {
      if (definitions.some((item) => item.id === app.id)) continue;

      const windowId =
        "installed-app-" +
        app.id.replace(/[^a-zA-Z0-9_-]/g, "-");

      definitions.push({
        id: app.id,
        name: app.name,
        iconUrl: app.iconUrl,
        open: () => this.openInstalledApp(app, windowId)
      });
    }

    return definitions;
  }

  private async renderPersonalization(): Promise<void> {
    const desktop = document.getElementById("desktop-area");
    const pinned = document.getElementById("taskbar-pinned");

    const definitions = this.getAppCatalog();

    if (desktop) {
      desktop
        .querySelectorAll(".user-desktop-icon")
        .forEach((node) => node.remove());

      const homeIds = new Set(
        this.getStoredIds(this.homeStorageKey)
      );

      for (const app of definitions) {
        if (!homeIds.has(app.id)) continue;
        this.appendDesktopShortcut(desktop, app);
      }
    }

    if (pinned) {
      pinned
        .querySelectorAll(".user-pinned-app")
        .forEach((node) => node.remove());

      const builtInIds = new Set([
        "computer",
        "explorer",
        "oqerun-store"
      ]);

      const pinnedIds = this.getStoredIds(
        this.pinnedStorageKey
      );

      // Built-in apps already have permanent taskbar buttons.
      // Do not create duplicate buttons when the user pins them.
      for (const id of pinnedIds) {
        if (builtInIds.has(id)) continue;

        const app = definitions.find(
          (item) => item.id === id
        );

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
    button.draggable = true;
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", app.id);
      button.classList.add("dragging");
    });
    button.addEventListener("dragend", () => button.classList.remove("dragging"));
    button.addEventListener("dragover", (event) => {
      event.preventDefault();
      button.classList.add("drag-over");
    });
    button.addEventListener("dragleave", () => button.classList.remove("drag-over"));
    button.addEventListener("drop", (event) => {
      event.preventDefault();
      button.classList.remove("drag-over");
      const draggedId = event.dataTransfer?.getData("text/plain");
      if (!draggedId || draggedId === app.id) return;

      const ids = this.getStoredIds(this.pinnedStorageKey).filter((id) => id !== draggedId);
      const targetIndex = ids.indexOf(app.id);
      ids.splice(Math.max(0, targetIndex), 0, draggedId);
      this.setStoredIds(this.pinnedStorageKey, ids);
      void this.renderPersonalization();
    });
    button.addEventListener("click", app.open);
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.showAppContextMenu(event.clientX, event.clientY, app.id, app.name);
    });

    container.appendChild(button);
  }

  private bindContextMenus(): void {
    document.querySelector(".taskbar")?.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.showTaskbarContextMenu(event.clientX, event.clientY);
    });

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
      const builtIn = this.getAppCatalog().find((item) => item.id === id);
      if (builtIn) {
        builtIn.open();
        return;
      }

      const installed = this.kernel.applications.get(id);
      if (installed) {
        const windowId =
          "installed-app-" +
          installed.id.replace(/[^a-zA-Z0-9_-]/g, "-");
        this.openInstalledApp(installed, windowId);
        return;
      }

      this.kernel.notify.info(
        name,
        "Oqerun could not find this application's installation record."
      );
    });

    add("Properties", () => {
      void this.showAppProperties(id, name);
    });

    if (this.installedApps.has(id)) {
      add("Uninstall", () => {
        void this.uninstallApp(id, name);
      });
    }

    menu.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.body.appendChild(menu);
  }

  private async uninstallApp(id: string, name: string): Promise<void> {
    const confirmed = window.confirm(`Uninstall ${name} from Oqerun OS?`);
    if (!confirmed) return;

    try {
      await this.kernel.applications.uninstall(id);
      this.installedApps.delete(id);

      this.setStoredIds(
        this.pinnedStorageKey,
        this.getStoredIds(this.pinnedStorageKey).filter((item) => item !== id)
      );
      this.setStoredIds(
        this.homeStorageKey,
        this.getStoredIds(this.homeStorageKey).filter((item) => item !== id)
      );

      await this.renderAppList();
      await this.renderPersonalization();
      this.kernel.notify.info(name, "Application uninstalled from Oqerun OS.");
      window.dispatchEvent(new CustomEvent("oqerun-app-uninstalled", { detail: { id } }));
    } catch (error) {
      this.kernel.notify.info(name, error instanceof Error ? error.message : "Unable to uninstall this application.");
    }
  }

  private async showAppProperties(id: string, fallbackName: string): Promise<void> {
    const builtIn = this.appDefinitions().find((item) => item.id === id);
    const installed = this.kernel.applications.get(id);

    const name = installed?.name ?? builtIn?.name ?? fallbackName;
    const version = installed?.version ?? "System application";
    const type = installed?.type ?? "built-in";
    const source = installed?.sourceUrl ?? "Managed by Oqerun OS";
    const permissions = installed?.permissions?.length
      ? installed.permissions.join(", ")
      : "None declared";
    const associations = installed?.fileAssociations?.length
      ? installed.fileAssociations.join(", ")
      : "None declared";

    const esc = (value: string): string =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;");

    const details = [
      ["Name", name],
      ["Version", version],
      ["Type", type],
      ["Permissions", permissions],
      ["File associations", associations],
      ["Launch source", source]
    ];

    this.wm.open({
      id: "app-properties-" + id.replace(/[^a-zA-Z0-9_-]/g, "-"),
      title: name + " Properties",
      iconUrl: installed?.iconUrl ?? builtIn?.iconUrl,
      width: 520,
      height: 420,
      x: 120,
      y: 90,
      content: `
        <div class="app-properties">
          <div class="app-properties-header">
            <strong>${esc(name)}</strong>
            <span>Application information</span>
          </div>
          <div class="app-properties-grid">
            ${details.map(([label, value]) =>
              `<div class="app-properties-row">
                <span>${esc(label)}</span>
                <strong>${esc(value)}</strong>
              </div>`
            ).join("")}
          </div>
          <div class="app-properties-actions">
            <button type="button" data-properties-open>Open Application</button>
            <button type="button" data-properties-close>Close</button>
          </div>
        </div>
      `
    });

    const propertiesId =
      "app-properties-" + id.replace(/[^a-zA-Z0-9_-]/g, "-");

    const propertiesWindow = document.getElementById(
      propertiesId
    );

    propertiesWindow?.querySelector("[data-properties-open]")?.addEventListener(
      "click",
      () => {
        const current = this.kernel.applications.get(id);
        if (current) {
          this.openInstalledApp(
            current,
            "installed-app-" + current.id.replace(/[^a-zA-Z0-9_-]/g, "-")
          );
        } else {
          builtIn?.open();
        }
      }
    );

    propertiesWindow?.querySelector("[data-properties-close]")?.addEventListener(
      "click",
      () => propertiesWindow?.remove()
    );
  }

  private showTaskbarContextMenu(x: number, y: number): void {
    this.removeContextMenu();

    const menu = document.createElement("div");
    menu.className = "oqerun-context-menu";

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

    const app = document.querySelector(".desktop");

    add("Move Taskbar to Top", () => {
      app?.classList.remove("taskbar-bottom");
      app?.classList.add("taskbar-top");
      localStorage.setItem("oqerun.taskbar.position", "top");
    });

    add("Move Taskbar to Bottom", () => {
      app?.classList.remove("taskbar-top");
      app?.classList.add("taskbar-bottom");
      localStorage.setItem("oqerun.taskbar.position", "bottom");
    });

    add("Compact Taskbar", () => {
      app?.classList.toggle("taskbar-compact");
      localStorage.setItem(
        "oqerun.taskbar.compact",
        app?.classList.contains("taskbar-compact") ? "1" : "0"
      );
    });

    add("Auto-hide Taskbar", () => {
      app?.classList.toggle("taskbar-auto-hide");
      localStorage.setItem(
        "oqerun.taskbar.autoHide",
        app?.classList.contains("taskbar-auto-hide") ? "1" : "0"
      );
    });

    add("Reset Taskbar", () => {
      app?.classList.remove("taskbar-top", "taskbar-compact", "taskbar-auto-hide");
      app?.classList.add("taskbar-bottom");
      localStorage.removeItem("oqerun.taskbar.position");
      localStorage.removeItem("oqerun.taskbar.compact");
      localStorage.removeItem("oqerun.taskbar.autoHide");
    });

    menu.addEventListener("click", (event) => {
      event.stopPropagation();
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

    menu.addEventListener("click", (event) => {
      event.stopPropagation();
    });

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
    this.updateSystemTray();
    setInterval(() => {
      update();
      this.updateSystemTray();
    }, 1000);
  }
}
