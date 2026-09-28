import "./ui/styles.css";
import "./ui/settings.css";
import "./ui/explorer.css";

import { Kernel } from "./core/Kernel"; 

const kernel = new Kernel();
kernel.boot();
