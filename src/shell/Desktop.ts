import { StartMenu } from "./StartMenu";

export class Desktop {
  private startMenu = new StartMenu();

  render(): void {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      <div class="desktop">

        <div class="desktop-area">

          <div class="desktop-icon">
            <div class="icon-box">🖥️</div>
            <span>Computer</span>
          </div>

        </div>

        <div id="start-menu" class="start-menu" style="display:none;">
          <h3>Oqerun</h3>
          <button>Terminal</button>
          <button>Explorer</button>
          <button>Settings</button>
        </div>

        <footer class="taskbar">
          <button id="start-btn" class="start-btn">O</button>

          <div class="taskbar-title">Oqerun OS</div>

          <div id="clock">--:--</div>
        </footer>

      </div>
    `;

    document
      .getElementById("start-btn")
      ?.addEventListener("click", () => this.startMenu.toggle());

    this.startClock();
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
