import { StartMenu } from "./StartMenu";
import { Explorer } from "./Explorer";
import { Computer } from "./Computer";
import { Terminal } from "./Terminal";
import { Settings } from "./Settings";
import { Store } from "./Store";

import { WindowManager } from "../window/WindowManager";
import { Kernel } from "../core/Kernel";


export class Desktop {

  private startMenu = new StartMenu();

  private wm = new WindowManager();

  private explorer: Explorer;
  private computer: Computer;
  private terminal: Terminal;
  private settings: Settings;
  private store: Store;


  /* =======================================================
     CONSTRUCTOR
     ======================================================= */

  constructor(private kernel: Kernel) {

    this.explorer =
      new Explorer(
        this.kernel,
        this.wm
      );

    this.computer =
      new Computer(
        this.kernel,
        this.wm
      );

    this.terminal =
      new Terminal(
        this.kernel,
        this.wm
      );

    this.settings =
      new Settings(
        this.kernel,
        this.wm
      );

    this.store =
      new Store(
        this.kernel,
        this.wm
      );
  }


  /* =======================================================
     RENDER DESKTOP
     ======================================================= */

  render(): void {

    const app =
      document.getElementById("app");

    if (!app) {
      console.error(
        "Oqerun OS: #app element not found."
      );

      return;
    }


    /*
     * Vite automatically provides the correct
     * deployment base path.
     *
     * Development:
     * /
     *
     * GitHub Pages:
     * /oqerun-os/
     */
    const base =
      import.meta.env.BASE_URL;


    /*
     * Apply Oqerun system theme.
     */
    if (
      !app.classList.contains("theme-system") &&
      !app.classList.contains("theme-dark") &&
      !app.classList.contains("theme-light")
    ) {
      app.classList.add("theme-system");
    }


    /* =====================================================
       DESKTOP HTML
       ===================================================== */

    app.innerHTML = `

      <div class="desktop">


        <!-- ===============================================
             DESKTOP AREA
             =============================================== -->

        <div class="desktop-area">


          <div
            class="desktop-icon"
            id="store-icon"
            tabindex="0"
            role="button"
            aria-label="Oqerun Store"
          >
            <img
              class="desktop-icon-image"
              src="${base}icons/oqerun-store.svg"
              alt="Oqerun Store"
              draggable="false"
            />
            <span>Oqerun Store</span>
          </div>

          <!-- COMPUTER DESKTOP ICON -->

          <div
            class="desktop-icon"
            id="computer-icon"
            tabindex="0"
            role="button"
            aria-label="Computer"
          >

            <img
              class="desktop-icon-image"
              src="${base}icons/computer.png"
              alt="Computer"
              draggable="false"
            />

            <span>
              Computer
            </span>

          </div>


        </div>


        <!-- ===============================================
             START MENU
             =============================================== -->

        <div
          id="start-menu"
          class="start-menu"
          style="display:none;"
        >


          <!-- Start Menu Header -->

          <div class="start-menu-header">

            <h3>
              Oqerun
            </h3>

          </div>


          <button
            id="open-store"
            class="start-menu-item"
            type="button"
          >
            <img
              class="start-icon"
              src="${base}icons/oqerun-store.svg"
              alt=""
              draggable="false"
            />
            <span>Oqerun Store</span>
          </button>

          <!-- ===========================================
               TERMINAL
               =========================================== -->

          <button
            id="open-terminal"
            class="start-menu-item"
            type="button"
          >

            <img
              class="start-icon"
              src="${base}icons/terminal.png"
              alt=""
              draggable="false"
            />

            <span>
              Terminal
            </span>

          </button>


          <!-- ===========================================
               EXPLORER
               =========================================== -->

          <button
            id="open-explorer"
            class="start-menu-item"
            type="button"
          >

            <img
              class="start-icon"
              src="${base}icons/explorer.png"
              alt=""
              draggable="false"
            />

            <span>
              Explorer
            </span>

          </button>


          <!-- ===========================================
               SETTINGS
               =========================================== -->

          <button
            id="open-settings"
            class="start-menu-item"
            type="button"
          >

            <img
              class="start-icon"
              src="${base}icons/settings.png"
              alt=""
              draggable="false"
            />

            <span>
              Settings
            </span>

          </button>


        </div>


        <!-- ===============================================
             TASKBAR
             =============================================== -->

        <footer class="taskbar">


          <!-- START BUTTON -->

          <button
            id="start-btn"
            class="start-btn"
            type="button"
            aria-label="Open Start Menu"
          >

            <img
              src="${base}branding/start-orb.png"
              alt="Oqerun"
              draggable="false"
            />

          </button>


          <!-- OQERUN OS TITLE -->

          <div class="taskbar-title">
            Oqerun OS
          </div>


          <!-- RUNNING APPLICATIONS -->

          <div
            id="taskbar-apps"
          ></div>


          <!-- CLOCK -->

          <div
            id="clock"
          >
            --:--
          </div>


        </footer>


      </div>
    `;


    /*
     * Bind desktop controls.
     */
    this.bindEvents();


    /*
     * Start system clock.
     */
    this.startClock();
  }


  /* =======================================================
     HIDE START MENU
     ======================================================= */

  private hideStartMenu(): void {

    const menu =
      document.getElementById(
        "start-menu"
      );

    if (menu) {

      menu.style.display =
        "none";
    }
  }


  /* =======================================================
     DESKTOP EVENTS
     ======================================================= */

  private bindEvents(): void {


    /* =====================================================
       START BUTTON
       ===================================================== */

    document
      .getElementById("start-btn")
      ?.addEventListener(
        "click",
        (event) => {

          event.stopPropagation();

          this.startMenu.toggle();
        }
      );


    /* =====================================================
       COMPUTER
       ===================================================== */

    document
      .getElementById("computer-icon")
      ?.addEventListener(
        "dblclick",
        () => {

          this.computer.open();
        }
      );


    /* =====================================================
       COMPUTER KEYBOARD
       ===================================================== */

    document
      .getElementById("computer-icon")
      ?.addEventListener(
        "keydown",
        (event) => {

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {

            event.preventDefault();

            this.computer.open();
          }
        }
      );


    /* =====================================================
       OQERUN STORE
       ===================================================== */

    document
      .getElementById("open-store")
      ?.addEventListener(
        "click",
        () => {
          this.hideStartMenu();
          this.store.open();
        }
      );

    document
      .getElementById("store-icon")
      ?.addEventListener(
        "dblclick",
        () => {
          this.store.open();
        }
      );

    document
      .getElementById("store-icon")
      ?.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.store.open();
          }
        }
      );


    /* =====================================================
       TERMINAL
       ===================================================== */

    document
      .getElementById("open-terminal")
      ?.addEventListener(
        "click",
        () => {

          this.hideStartMenu();

          this.terminal.open();
        }
      );


    /* =====================================================
       EXPLORER
       ===================================================== */

    document
      .getElementById("open-explorer")
      ?.addEventListener(
        "click",
        () => {

          this.hideStartMenu();

          this.explorer.open(
            "/home/user"
          );
        }
      );


    /* =====================================================
       SETTINGS
       ===================================================== */

    document
      .getElementById("open-settings")
      ?.addEventListener(
        "click",
        () => {

          this.hideStartMenu();

          this.settings.open();
        }
      );


    /* =====================================================
       OUTSIDE CLICK
       ===================================================== */

    document.addEventListener(
      "click",
      (event) => {

        const target =
          event.target as HTMLElement;

        if (
          !target.closest(
            "#start-menu"
          ) &&
          !target.closest(
            "#start-btn"
          )
        ) {

          this.hideStartMenu();
        }
      }
    );
  }


  /* =======================================================
     SYSTEM CLOCK
     ======================================================= */

  private startClock(): void {

    const clock =
      document.getElementById(
        "clock"
      );

    if (!clock) {
      return;
    }


    const update = (): void => {

      clock.textContent =
        new Date().toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        );
    };


    /*
     * Initial clock update.
     */
    update();


    /*
     * Update every second.
     */
    setInterval(
      update,
      1000
    );
  }

}
