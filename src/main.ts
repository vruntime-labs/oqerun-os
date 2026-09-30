import "./ui/styles.css";
import "./ui/settings.css";
import "./ui/explorer.css";
import "./ui/cloud.css";

import { Kernel } from "./core/Kernel";
import { Desktop } from "./shell/Desktop";


/* =========================================================
   OQERUN OS
   SYSTEM BOOT
   ========================================================= */

const app = document.getElementById("app");

if (!app) {
  throw new Error(
    "Oqerun OS: #app element was not found."
  );
}


/* =========================================================
   VITE BASE PATH
   ========================================================= */

const base = import.meta.env.BASE_URL;

function handleCloudOAuthHandoff(): void {
  const prefix = "#oqerun-cloud-session=";

  if (
    !window.location.hash.startsWith(prefix) ||
    !window.opener
  ) {
    return;
  }

  const sessionId = decodeURIComponent(
    window.location.hash.slice(prefix.length)
  );

  if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) {
    return;
  }

  try {
    window.opener.postMessage(
      {
        source: "oqerun-cloud",
        type: "google-connected",
        sessionId
      },
      "https://vruntime-labs.github.io"
    );
  } catch {
    return;
  }

  window.history.replaceState(
    null,
    document.title,
    window.location.pathname +
      window.location.search
  );

  window.setTimeout(() => {
    window.close();
  }, 150);
}

handleCloudOAuthHandoff();


/* =========================================================
   BOOT SCREEN
   ========================================================= */

app.innerHTML = `
  <div class="boot-screen">

    <img
      class="boot-logo"
      src="${base}branding/logo.png.png"
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

    <div class="boot-dots" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>

  </div>
`;


/* =========================================================
   BOOT ELEMENTS
   ========================================================= */

const bootScreen =
  document.querySelector(
    ".boot-screen"
  ) as HTMLElement | null;


const bootStatus =
  document.querySelector(
    ".boot-status"
  ) as HTMLElement | null;


/* =========================================================
   BOOT MESSAGES
   ========================================================= */

const bootMessages = [
  "Starting system",
  "Loading kernel",
  "Initializing filesystem",
  "Loading desktop"
];


let messageIndex = 0;


/* =========================================================
   BOOT MESSAGE TIMER
   ========================================================= */

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

  const kernel =
    new Kernel();

  const desktop =
    new Desktop(kernel);

  if (bootScreen) {

    bootScreen.classList.add(
      "boot-fade-out"
    );
  }

  window.setTimeout(() => {

    desktop.render();

  }, 450);

}, 2400);
