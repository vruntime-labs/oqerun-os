import "./ui/styles.css";

import { Kernel } from "./core/Kernel";
import { Desktop } from "./shell/Desktop";


/* =========================================================
   OQERUN OS BOOTSTRAP
   ========================================================= */

const app = document.getElementById("app");

if (!app) {
  throw new Error(
    "Oqerun OS: #app element was not found."
  );
}


/* =========================================================
   KERNEL
   ========================================================= */

const kernel = new Kernel();


/* =========================================================
   DESKTOP
   ========================================================= */

const desktop = new Desktop(kernel);


/* =========================================================
   START DESKTOP
   ========================================================= */

desktop.render();
