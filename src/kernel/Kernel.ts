import { Boot } from "./Boot";
import { Desktop } from "../shell/Desktop";

export class Kernel {
  readonly version = "0.1.0";
  readonly codename = "Boot";

  async boot(): Promise<void> {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      <main class="boot-screen">
        <h1>OQERUN OS</h1>
        <p>Version ${this.version} • "${this.codename}"</p>
        <p id="boot-status">Starting...</p>
      </main>
    `;

    const status = document.getElementById("boot-status");
    const boot = new Boot();

    await boot.start(text => {
      if (status) status.textContent = text;
    });

    new Desktop().render();
  }
}
