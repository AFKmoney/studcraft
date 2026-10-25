import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Standalone build of the Studcraft game only — no TanStack Start, no auth,
// no platform chrome. Produces a static site in dist-game/ that runs offline
// once loaded (saves live in localStorage).
export default defineConfig({
  root: "standalone",
  publicDir: "../public/icons-160",
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../dist-game",
    emptyOutDir: true,
    chunkSizeWarningLimit: 4096,
  },
});
