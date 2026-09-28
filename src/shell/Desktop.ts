import { StartMenu } from "./StartMenu";
import { Explorer } from "./Explorer";
import { Computer } from "./Computer";
import { Terminal } from "./Terminal";
import { Settings } from "./Settings";
import { WindowManager } from "../window/WindowManager";
import { Kernel } from "../core/Kernel";

export class Desktop {
  private startMenu = new StartMenu();
  private wm = new WindowManager();

  private explorer: Explorer;
  private computer: Computer;
  private terminal: Terminal;
  private settings: Settings;

  constructor(private kernel: Kernel) {
    this.explorer = new Explorer(this.kernel, this.wm);
    this.computer = new Computer(this.kernel, this.wm);
    this.terminal = new Terminal(this.kernel, this.wm);
    this.settings = new Settings(this.kernel, this.wm);
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
      .getElementById("computer-icon")
      ?.addEventListener("dblclick", () => this.computer.open());

    document
      .getElementById("open-explorer")
      ?.addEventListener("click", () => this.explorer.open("/home/user"));

    document
      .getElementById("open-terminal")
      ?.addEventListener("click", () => this.terminal.open());

    document
      .getElementById("open-settings")
      ?.addEventListener("click", () => this.settings.open());
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
