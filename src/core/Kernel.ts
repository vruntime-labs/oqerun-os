import { Boot } from "./Boot";
import { Desktop } from "../shell/Desktop";
import { ProcessManager } from "./ProcessManager";
import { Syscalls } from "./Syscalls";
import { NotificationService } from "./NotificationService";
import { ApplicationManager } from "./ApplicationManager";

export class Kernel {
  public readonly version = "0.3.0";
  public readonly codename = "Pulse";

  public readonly processes: ProcessManager;
  public readonly sys: Syscalls;
  public readonly notify: NotificationService;
  public readonly applications: ApplicationManager;

  constructor() {
    this.processes = new ProcessManager();
    this.sys = new Syscalls();
    this.notify = new NotificationService();
    this.applications = new ApplicationManager(this.sys);
  }

  async boot(): Promise<void> {
    const boot = new Boot();

    await boot.start();

    await this.initializeFilesystem();
    await this.applications.initialize();

    new Desktop(this).render();

    this.notify.info(
      "Oqerun OS",
      `${this.version} "${this.codename}" started successfully.`
    );
  }

  private async initializeFilesystem(): Promise<void> {
    const folders = [
      "/system",
      "/home",
      "/home/user",
      "/home/user/Documents",
      "/home/user/Downloads",
      "/home/user/Pictures",
      "/home/user/Desktop"
    ];

    for (const folder of folders) {
      try {
        if (!(await this.sys.exists(folder))) {
          await this.sys.mkdir(folder);
        }
      } catch {
        // Folder already exists or creation failed.
      }
    }

    const prefPath = "/system/preferences.json";

    try {
      if (!(await this.sys.exists(prefPath))) {
        await this.sys.write(
          prefPath,
          JSON.stringify(
            {
              theme: "system",
              accent: "#00D4FF"
            },
            null,
            2
          )
        );
      }
    } catch {
      // Ignore initialization errors for now.
    }
  }
}
