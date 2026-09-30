import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [cloudflare()],

  // Cloudflare Workers serves Oqerun from "/".
  // GitHub Pages overrides this with VITE_BASE_PATH=/oqerun-os/.
  base: process.env.VITE_BASE_PATH || "/",

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
