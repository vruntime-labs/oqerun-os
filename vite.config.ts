import { defineConfig } from "vite";

export default defineConfig({
  /*
   * Oqerun OS is deployed as a GitHub Pages
   * repository site under /oqerun-os/
   */
  base: "/oqerun-os/",

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
