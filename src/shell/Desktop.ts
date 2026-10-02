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
            <h3>Oqerun</h3>
          </div>

          <button
            id="open-store"
            class="start-menu-item"
            type="button"
          >
            <img
              class="start-icon"
              src="${base}icons/oqerun-store.svg"
              alt=""
              draggable="false"
            />
            <span>Oqerun Store</span>
          </button>

          <button
            id="open-terminal"
            class="start-menu-item"
            type="button"
          >
            <img
              class="start-icon"
              src="${base}icons/terminal.png"
              alt=""
              draggable="false"
            />
            <span>Terminal</span>
          </button>

          <button
            id="open-explorer"
            class="start-menu-item"
            type="button"
          >
            <img
              class="start-icon"
              src="${base}icons/explorer.png"
              alt=""
              draggable="false"
            />
            <span>Explorer</span>
          </button>

          <div id="installed-apps"></div>

          <button
            id="open-settings"
            class="start-menu-item"
            type="button"
          >
            <img
              class="start-icon"
              src="${base}icons/settings.png"
              alt=""
              draggable="false"
            />
            <span>Settings</span>
          </button>
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

          <div class="taskbar-title">
            Oqerun OS
          </div>

          <div id="taskbar-apps"></div>

          <div id="clock">
            --:--
          </div>
        </footer>
      </div>
    `;

    this.bindEvents();

    // Populate the Start menu from the persistent application registry.
    void this.renderInstalledApps();

    this.startClock();
  }

  private hideStartMenu(): void {
    const menu = document.getElementById("start-menu");

    if (menu) {
      menu.style.display = "none";
    }
  }

  private bindEvents(): void {
    document
      .getElementById("start-btn")
      ?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.startMenu.toggle();
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
      .getElementById("open-store")
      ?.addEventListener("click", () => {
        this.hideStartMenu();
        this.store.open();
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

    document
      .getElementById("open-terminal")
      ?.addEventListener("click", () => {
        this.hideStartMenu();
        this.terminal.open();
      });

    document
      .getElementById("open-explorer")
      ?.addEventListener("click", () => {
        this.hideStartMenu();
        this.explorer.open("/home/user");
      });

    document
      .getElementById("open-settings")
      ?.addEventListener("click", () => {
        this.hideStartMenu();
        this.settings.open();
      });

    // Refresh the Start menu immediately after the Store installs an app.
    window.addEventListener("oqerun-app-installed", () => {
      void this.renderInstalledApps();
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

  private async renderInstalledApps(): Promise<void> {
    const container = document.getElementById("installed-apps");
    if (!container) return;

    const apps = await this.kernel.applications.list();
    container.innerHTML = "";

    if (apps.length === 0) return;

    const label = document.createElement("div");
    label.className = "start-menu-section-label";
    label.textContent = "Installed Apps";
    container.appendChild(label);

    for (const app of apps) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "start-menu-item";
      button.title = app.name;

      const icon = document.createElement("span");
      icon.className = "start-icon";
      icon.textContent = "▣";

      const name = document.createElement("span");
      name.textContent = app.name;

      button.append(icon, name);

      button.addEventListener("click", () => {
        this.hideStartMenu();

        if (!app.sourceUrl) {
          this.kernel.notify.info(
            app.name,
            "This application does not have a launch URL yet."
          );
          return;
        }

        const windowId =
          "installed-app-" +
          app.id.replace(/[^a-zA-Z0-9_-]/g, "-");

        this.wm.open({
          id: windowId,
          title: app.name,
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
      });

      container.appendChild(button);
    }
  }

  private escapeAttribute(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("\"", "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
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
