import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [cloudflare()],

  base: "/oqerun-os/",

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
