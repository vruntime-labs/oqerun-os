export class Desktop {
  render(): void {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      <div class="desktop">
        <div class="desktop-area"></div>

        <footer class="taskbar">
          <button class="start-btn">O</button>
          <div class="taskbar-title">Oqerun OS</div>
          <div id="clock">--:--</div>
        </footer>
      </div>
    `;

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
