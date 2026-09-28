import { Boot } from "./Boot";
import { Syscalls } from "./Syscalls";
import { Desktop } from "../shell/Desktop";

export class Kernel {
  readonly version = "0.2.0";
  readonly codename = "Pulse";

  public readonly sys = new Syscalls();

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

    await this.initializeSystem();

    new Desktop().render();

    console.log(`Oqerun Core ${this.version} started.`);
  }

  private async initializeSystem(): Promise<void> {
    await this.sys.mkdir("/home");
    await this.sys.mkdir("/home/user");
    await this.sys.mkdir("/home/user/Desktop");
    await this.sys.mkdir("/home/user/Documents");
    await this.sys.mkdir("/home/user/Downloads");
    await this.sys.mkdir("/home/user/Pictures");

    await this.sys.mkdir("/apps");
    await this.sys.mkdir("/system");
    await this.sys.mkdir("/temp");

    await this.sys.mkdir("/mnt");
    await this.sys.mkdir("/mnt/computer");
    await this.sys.mkdir("/mnt/cloud");

    const welcomeFile = "/home/user/Documents/Welcome.oqtxt";

    if (!(await this.sys.exists(welcomeFile))) {
      await this.sys.write(
        welcomeFile,
        "Welcome to Oqerun OS!\n\nYour Oqerun Drive is ready."
      );
    }
  }
}
