import { defineConfig } from "vite";

export default defineConfig({
  /*
   * Oqerun OS is deployed as a GitHub Pages
   * repository site.
   *
   * Repository:
   * oqerun-os
   *
   * Therefore the production base path is:
   * /oqerun-os/
   */
  base: "/oqerun-os/",

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
