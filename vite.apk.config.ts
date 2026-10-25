import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// APK build: one classic script + one stylesheet, no ES modules, so the
// Android WebView can run it straight from file:///android_asset/ offline.
export default defineConfig({
  root: "standalone-apk",
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../dist-apk",
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 8192,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "game.js",
        assetFileNames: (info) => (info.name && info.name.endsWith(".css") ? "game.css" : "[name][extname]"),
      },
    },
  },
});
