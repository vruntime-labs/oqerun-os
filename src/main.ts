import "./ui/styles.css";

import { Kernel } from "./core/Kernel";
import { Desktop } from "./shell/Desktop";


/* =========================================================
   OQERUN OS BOOT
   ========================================================= */

const app = document.getElementById("app");

if (!app) {
  throw new Error(
    "Oqerun OS: #app element was not found."
  );
}


/* =========================================================
   BASE PATH
   ========================================================= */

const base = import.meta.env.BASE_URL;


/* =========================================================
   BOOT SCREEN
   ========================================================= */

app.innerHTML = `
  <div class="boot-screen">

    <img
      class="boot-logo"
      src="${base}branding/logo.png"
      alt="Oqerun OS"
      draggable="false"
    />

    <div class="boot-title">
      Oqerun OS
    </div>

    <div class="boot-version">
      Lightweight Web Operating System
    </div>

    <div class="boot-status">
      Starting system
    </div>

    <div class="boot-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>

  </div>
`;


/* =========================================================
   BOOT SEQUENCE
   ========================================================= */

const bootScreen =
  document.querySelector(
    ".boot-screen"
  ) as HTMLElement | null;


const bootStatus =
  document.querySelector(
    ".boot-status"
  ) as HTMLElement | null;


/*
 * Boot messages.
 */

const bootMessages = [
  "Starting system",
  "Loading kernel",
  "Initializing filesystem",
  "Loading desktop",
];


let messageIndex = 0;


/*
 * Update boot message.
 */

const messageTimer =
  window.setInterval(() => {

    messageIndex++;

    if (
      messageIndex <
      bootMessages.length
    ) {

      if (bootStatus) {

        bootStatus.textContent =
          bootMessages[messageIndex];
      }
    }

  }, 550);


/* =========================================================
   START OQERUN
   ========================================================= */

window.setTimeout(() => {

  window.clearInterval(
    messageTimer
  );


  /* ===============================================
     INITIALIZE KERNEL
     =============================================== */

  const kernel =
    new Kernel();


  /* ===============================================
     CREATE DESKTOP
     =============================================== */

  const desktop =
    new Desktop(kernel);


  /* ===============================================
     FADE OUT BOOT SCREEN
     =============================================== */

  if (bootScreen) {

    bootScreen.classList.add(
      "boot-fade-out"
    );
  }


  /*
   * Give the fade-out animation time to finish.
   */

  window.setTimeout(() => {

    desktop.render();

  }, 450);


}, 2400);
