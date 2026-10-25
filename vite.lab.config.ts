import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist-lab",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "lab.html"),
    },
  },
});
