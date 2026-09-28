import { Boot } from "./Boot";
import { Syscalls } from "./Syscalls";
import { Desktop } from "../shell/Desktop";

export class Kernel {
  readonly version = "0.2.0";
  readonly codename = "Pulse";

  readonly sys = new Syscalls();

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

    await boot.start((text) => {
      if (status) status.textContent = text;
    });

    await this.sys.mkdir("/home/user");
    await this.sys.mkdir("/home/user/Desktop");
    await this.sys.mkdir("/home/user/Documents");
    await this.sys.mkdir("/home/user/Downloads");
    await this.sys.mkdir("/home/user/Pictures");

    new Desktop().render();

    console.log(`Oqerun Core ${this.version} started.`);
  }
}
