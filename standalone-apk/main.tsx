import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles.css";
import { GameView } from "../src/game/GameView";

// The APK build loads this as a classic script from <head> (file://), so the
// #root div may not exist yet — wait for the DOM before mounting.
function start() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <GameView />
    </StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
