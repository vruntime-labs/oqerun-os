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

    app.classList.add("theme-system");

    app.innerHTML = `
      <div class="desktop">

        <!-- =========================
             Desktop Area
        ========================== -->

        <div class="desktop-area">

          <div class="desktop-icon" id="computer-icon">

            <img
              src="/oqerun-os/branding/computer.png"
              alt="Computer"
              class="desktop-icon-image"
            >

            <span>Computer</span>

          </div>

        </div>


        <!-- =========================
             Start Menu
        ========================== -->

        <div id="start-menu" class="start-menu" style="display:none;">

          <div class="start-menu-header">
            <h3>Oqerun</h3>
          </div>

          <div class="start-menu-apps">

            <button
              id="open-terminal"
              class="start-app"
              type="button"
            >
              <img
                src="/oqerun-os/branding/terminal.png"
                alt=""
                class="start-icon"
              >
              <span>Terminal</span>
            </button>


            <button
              id="open-explorer"
              class="start-app"
              type="button"
            >
              <img
                src="/oqerun-os/branding/explorer.png"
                alt=""
                class="start-icon"
              >
              <span>Explorer</span>
            </button>


            <button
              id="open-settings"
              class="start-app"
              type="button"
            >
              <img
                src="/oqerun-os/branding/settings.png"
                alt=""
                class="start-icon"
              >
              <span>Settings</span>
            </button>

          </div>

        </div>


        <!-- =========================
             Taskbar
        ========================== -->

        <footer class="taskbar">

          <button
            id="start-btn"
            class="start-btn"
            type="button"
            aria-label="Open Start Menu"
          >
            <img
              src="/oqerun-os/branding/start-orb.png"
              alt="Oqerun"
              class="start-orb"
            >
          </button>


          <div class="taskbar-title">
            Oqerun OS
          </div>


          <div id="taskbar-apps"></div>


          <div id="clock">
            --:--
          </div>

        </footer>

      </div>
    `;

    this.bindEvents();
    this.startClock();
  }


  private hideStartMenu(): void {
    const menu = document.getElementById("start-menu");

    if (menu) {
      menu.style.display = "none";
    }
  }


  private bindEvents(): void {

    /* =========================
       Start Button
    ========================== */

    document
      .getElementById("start-btn")
      ?.addEventListener("click", (event) => {

        event.stopPropagation();

        this.startMenu.toggle();

      });


    /* =========================
       Computer
    ========================== */

    document
      .getElementById("computer-icon")
      ?.addEventListener("dblclick", () => {

        this.computer.open();

      });


    /* =========================
       Explorer
    ========================== */

    document
      .getElementById("open-explorer")
      ?.addEventListener("click", () => {

        this.hideStartMenu();

        this.explorer.open("/home/user");

      });


    /* =========================
       Terminal
    ========================== */

    document
      .getElementById("open-terminal")
      ?.addEventListener("click", () => {

        this.hideStartMenu();

        this.terminal.open();

      });


    /* =========================
       Settings
    ========================== */

    document
      .getElementById("open-settings")
      ?.addEventListener("click", () => {

        this.hideStartMenu();

        this.settings.open();

      });


    /* =========================
       Close Start Menu
       when clicking outside
    ========================== */

    document.addEventListener("click", (event) => {

      const target = event.target as HTMLElement;

      if (
        !target.closest("#start-menu") &&
        !target.closest("#start-btn")
      ) {
        this.hideStartMenu();
      }

    });

  }


  /* =========================
     Clock
  ========================== */

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
