import { StartMenu } from "./StartMenu";
import { Explorer } from "./Explorer";
import { WindowManager } from "../window/WindowManager";
import { Kernel } from "../core/Kernel";

export class Desktop {
  private startMenu = new StartMenu();
  private wm = new WindowManager();
  private explorer: Explorer;

  constructor(private kernel: Kernel) {
    this.explorer = new Explorer(this.kernel, this.wm);
  }

  render(): void {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      <div class="desktop">

        <div class="desktop-area">
          <div class="desktop-icon" id="computer-icon">
            <div class="icon-box">🖥️</div>
            <span>Computer</span>
          </div>
        </div>

        <div id="start-menu" class="start-menu" style="display:none;">
          <h3>Oqerun</h3>
          <button id="open-terminal">Terminal</button>
          <button id="open-explorer">Explorer</button>
          <button id="open-settings">Settings</button>
        </div>

        <footer class="taskbar">
          <button id="start-btn" class="start-btn">O</button>
          <div class="taskbar-title">Oqerun OS</div>
          <div id="clock">--:--</div>
        </footer>

      </div>
    `;

    this.bindEvents();
    this.startClock();
  }

  private bindEvents(): void {
    document
      .getElementById("start-btn")
      ?.addEventListener("click", () => this.startMenu.toggle());

    document
      .getElementById("open-explorer")
      ?.addEventListener("click", () => this.explorer.open("/home/user"));

    document
      .getElementById("computer-icon")
      ?.addEventListener("dblclick", () => this.explorer.open("/home/user"));

    document
      .getElementById("open-terminal")
      ?.addEventListener("click", () => {
        this.wm.open({
          id: "terminal",
          title: "Terminal",
          content: "<p>Terminal coming soon...</p>",
          width: 520,
          height: 320,
          x: 140,
          y: 90
        });
      });

    document
      .getElementById("open-settings")
      ?.addEventListener("click", () => {
        this.wm.open({
          id: "settings",
          title: "Settings",
          content: "<p>Settings coming soon...</p>",
          width: 500,
          height: 360,
          x: 220,
          y: 110
        });
      });
  }

  private startClock(): void {
    const clock = document.getElementById("clock");
    if (!clock) return;

    const update = () => {
      clock.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    update();
    setInterval(update, 1000);
  }
}
