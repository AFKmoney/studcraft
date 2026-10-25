import { defineConfig } from "vite";
import { resolve } from "path";

// Icon lab: renders every placeable block as an isometric cube from the
// game's real atlas + mesher (see src/lab/icons.ts). Dev-server only.
export default defineConfig({
  build: {
    outDir: "dist-icons",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "icons.html"),
    },
  },
});
