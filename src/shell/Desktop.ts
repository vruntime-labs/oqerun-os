import { StartMenu } from "./StartMenu";
import { WindowManager } from "../window/WindowManager";

export class Desktop {
  private startMenu = new StartMenu();
  private wm = new WindowManager();

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
      .getElementById("open-terminal")
      ?.addEventListener("click", () => {
        this.wm.open({
          id: "terminal",
          title: "Terminal",
          content: "<p>Oqerun Terminal coming soon...</p>",
          width: 520,
          height: 320,
          x: 140,
          y: 90
        });
      });

    document
      .getElementById("open-explorer")
      ?.addEventListener("click", () => {
        this.wm.open({
          id: "explorer",
          title: "File Explorer",
          content: "<p>Virtual File System coming soon...</p>",
          width: 620,
          height: 400,
          x: 180,
          y: 80
        });
      });

    document
      .getElementById("open-settings")
      ?.addEventListener("click", () => {
        this.wm.open({
          id: "settings",
          title: "Settings",
          content: "<p>Settings panel coming soon...</p>",
          width: 500,
          height: 360,
          x: 220,
          y: 110
        });
      });

    document
      .getElementById("computer-icon")
      ?.addEventListener("dblclick", () => {
        this.wm.open({
          id: "computer",
          title: "Computer",
          content: "<p>Computer view coming soon...</p>",
          width: 620,
          height: 400,
          x: 160,
          y: 70
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
