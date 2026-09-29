import "./style.css";

import { Kernel } from "./core/Kernel";
import { Desktop } from "./ui/Desktop";

const app = document.getElementById("app");

if (!app) {
  throw new Error("Oqerun OS: #app element not found");
}

/*
 * Start the Oqerun operating environment.
 */
const kernel = new Kernel();

/*
 * Create the desktop shell.
 */
const desktop = new Desktop(kernel);

/*
 * Render the desktop.
 */
desktop.render();
