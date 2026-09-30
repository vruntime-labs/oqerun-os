import "./ui/styles.css";
import "./ui/settings.css";
import "./ui/explorer.css";
import "./ui/cloud.css";

import { Kernel } from "./core/Kernel";
import { Desktop } from "./shell/Desktop";
import { setCloudSessionToken } from "./cloud/CloudSession";


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


/* =========================================================
   CLOUD OAUTH HANDOFF
   ========================================================= */

function acceptCloudSession(
  sessionId: unknown
): void {
  if (
    typeof sessionId !== "string" ||
    !/^[A-Za-z0-9_-]+$/.test(sessionId)
  ) {
    return;
  }

  /*
   * Store the session in THIS browser tab immediately.
   *
   * The OAuth popup is a separate browsing context, so its
   * sessionStorage is not shared with the original Oqerun tab.
   * Doing this in main.ts guarantees that the original tab
   * receives the cloud session before CloudManager creates
   * GoogleDriveProvider.
   */
  setCloudSessionToken(sessionId);

  const message = {
    source: "oqerun-cloud",
    type: "google-connected",
    sessionId
  };

  /*
   * Keep the existing cross-window handoff for any component
   * that is already listening.
   */
  try {
    if (window.opener) {
      window.opener.postMessage(
        message,
        "https://vruntime-labs.github.io"
      );
    }
  } catch {
    // The direct session-storage handoff above is sufficient.
  }

  /*
   * BroadcastChannel is also useful for other Oqerun tabs.
   */
  try {
    if (
      typeof BroadcastChannel !==
      "undefined"
    ) {
      const channel =
        new BroadcastChannel(
          "oqerun-cloud"
        );

      channel.postMessage(
        message
      );

      window.setTimeout(() => {
        channel.close();
      }, 1000);
    }
  } catch {
    // Ignore unsupported BroadcastChannel implementations.
  }
}


function handleCloudOAuthHandoff(): void {
  const prefix =
    "#oqerun-cloud-session=";

  if (
    !window.location.hash.startsWith(prefix)
  ) {
    return;
  }

  const sessionId =
    decodeURIComponent(
      window.location.hash.slice(
        prefix.length
      )
    );

  acceptCloudSession(sessionId);

  /*
   * Remove the session identifier from the visible URL
   * immediately after consuming it.
   */
  window.history.replaceState(
    null,
    document.title,
    window.location.pathname +
      window.location.search
  );

  /*
   * This page was opened as the OAuth callback popup.
   * Give the original tab a moment to receive the message,
   * then close the popup automatically.
   */
  window.setTimeout(() => {
    window.close();
  }, 250);
}


/*
 * Also support the callback's postMessage path. This is useful
 * when a browser preserves window.opener during OAuth navigation.
 */
window.addEventListener(
  "message",
  event => {
    if (
      event.origin !==
      "https://vruntime-labs.github.io"
    ) {
      return;
    }

    if (
      event.data?.source !==
        "oqerun-cloud" ||
      event.data?.type !==
        "google-connected"
    ) {
      return;
    }

    acceptCloudSession(
      event.data.sessionId
    );
  }
);


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
