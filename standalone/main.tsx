import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles.css";
import { GameView } from "../src/game/GameView";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameView />
  </StrictMode>,
);
