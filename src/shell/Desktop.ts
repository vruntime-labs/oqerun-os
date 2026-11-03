import { StartMenu } from "./StartMenu";
import { Explorer } from "./Explorer";
import { Computer } from "./Computer";
import { Terminal } from "./Terminal";
import { Settings } from "./Settings";
import { Store } from "./Store";
import { TaskManager } from "./TaskManager";

import { WindowManager } from "../window/WindowManager";
import { Kernel } from "../core/Kernel";
import { Path } from "../vfs/Path";

export class Desktop {
  private startMenu = new StartMenu();
  private wm = new WindowManager();

  private explorer: Explorer;
  private computer: Computer;
  private terminal: Terminal;
  private settings: Settings;
  private store: Store;
  private taskManager: TaskManager;

  private readonly pinnedStorageKey = "oqerun.pinnedApps";
  private readonly homeStorageKey = "oqerun.homeApps";
  private readonly desktopPositionsKey = "oqerun.desktopPositions";
  private installedApps = new Map<string, Awaited<ReturnType<Kernel["applications"]["list"]>>[number]>();

  constructor(private kernel: Kernel) {
    this.explorer = new Explorer(this.kernel, this.wm);
    this.computer = new Computer(this.kernel, this.wm);
    this.terminal = new Terminal(this.kernel, this.wm);
    this.settings = new Settings(this.kernel, this.wm);
    this.store = new Store(this.kernel, this.wm);
    this.taskManager = new TaskManager(this.kernel, this.wm);
  }

  render(): void {
    const app = document.getElementById("app");

    if (!app) {
      console.error("Oqerun OS: #app element not found.");
      return;
    }

    const base = import.meta.env.BASE_URL;
