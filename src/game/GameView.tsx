import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode, Fragment } from "react";
import { CATALOG, COLORS, ID, TEKS, def } from "./blocks";
import type { EnterKind, GameApi, Phase, Quality, Upscale } from "./game";
import { RECIPES, type Recipe } from "./recipes";
import { CODEX, PERKS } from "./ranks";
import { PATHS, PATH_CHANGE_COST } from "./identity";
import { ItemIcon } from "./icons";
import { SKILLS } from "./skills";
import type { WorldSlot } from "./save";
import { BTN, PadEdges, activePad, stick } from "./gamepad";
import {
  BackIcon,
  BagIcon,
  BookIcon,
  BoltIcon,
  BubbleIcon,
  CheckIcon,
  CloseIcon,
  CloudIcon,
  ControllerIcon,
  CopyIcon,
  DiceIcon,
  ExitIcon,
  EyeIcon,
  FoodIcon,
  GearIcon,
  GlobeIcon,
  HammerIcon,
  HandIcon,
  HeartIcon,
  JumpIcon,
  LockIcon,
  MedalIcon,
  MoonIcon,
  PauseIcon,
  PickIcon,
  PlayIcon,
  PlusIcon,
  RainIcon,
  ScrollIcon,
  ShieldIcon,
  SoundIcon,
  StarIcon,
  SunIcon,
  TrashIcon,
} from "./ui-icons";

const VERSION = "4.0";

// ─────────────────────────────────────────────────────────────────────────────
// Root: boots the engine, catches crashes, watches for a lost GPU context.
// ─────────────────────────────────────────────────────────────────────────────

export function GameView() {
  return (
    <CrashGuard>
      <GameHost />
    </CrashGuard>
  );
}

class CrashGuard extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Studcraft crashed", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return <FatalScreen title="Something cracked" detail={this.state.error.message} />;
    }
    return this.props.children;
  }
}

function FatalScreen({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="sc-root sc-fatal" role="alert">
      <div className="sc-panel sc-fatal-card">
        <Logo small />
        <h2 className="sc-h2">{title}</h2>
        <p className="sc-muted">Your world is saved every few seconds, so reloading picks up where you left off.</p>
        <code className="sc-code">{detail}</code>
        <button className="sc-btn sc-btn-primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    </div>
  );
}

function GameHost() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [api, setApi] = useState<GameApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gpuLost, setGpuLost] = useState(false);

  useEffect(() => {
    let dead = false;
    let mounted: GameApi | null = null;
    const canvas = canvasRef.current;
    const lost = (e: Event) => {
      e.preventDefault();
      setGpuLost(true);
    };
    const restored = () => setGpuLost(false);
    canvas?.addEventListener("webglcontextlost", lost);
    canvas?.addEventListener("webglcontextrestored", restored);
    if (!supportsWebGL2()) {
      setError("This browser can't run WebGL 2, which the brick world needs. Try an up-to-date Chrome, Edge, Firefox or Safari.");
    } else {
      void import("./game")
        .then(({ mount }) => {
          if (dead || !canvasRef.current) return;
          mounted = mount(canvasRef.current);
          setApi(mounted);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "The brick world failed to start");
        });
    }
    return () => {
      dead = true;
      canvas?.removeEventListener("webglcontextlost", lost);
      canvas?.removeEventListener("webglcontextrestored", restored);
      mounted?.destroy();
    };
  }, []);

  return (
    <div className="sc-root game-root" role="application" aria-label="Studcraft">
      <canvas ref={canvasRef} className="sc-world" />
      <svg className="sc-defs" width="0" height="0" aria-hidden="true">
        <defs>
          <clipPath id="half-l">
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
          <clipPath id="half-r">
            <rect x="12" y="0" width="12" height="24" />
          </clipPath>
        </defs>
      </svg>
      {error ? (
        <FatalScreen title="The world couldn't start" detail={error} />
      ) : api ? (
        <Overlay game={api} />
      ) : (
        <BootScreen />
      )}
      {gpuLost && <FatalScreen title="Graphics paused" detail="The graphics driver reset (low memory or a backgrounded tab)." />}
    </div>
  );
}

function supportsWebGL2() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

function BootScreen() {
  return (
    <div className="sc-boot">
      <Logo />
      <div className="sc-boot-bar">
        <span />
      </div>
      <p className="sc-muted">Stacking the first bricks…</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────────────

function Logo({ small = false }: { small?: boolean }) {
  // STUDS · Plastic Edition key art (approved by Philippe 2026-10-28):
  // transparent PNG/WebP floating over the live world — no background band.
  return (
    <div className={small ? "sc-logo sc-logo-sm" : "sc-logo"} aria-label="Studs — Plastic Edition">
      <img className="sc-logo-img" src="logo-keyart.webp" alt="Studs — Plastic Edition" draggable={false} />
    </div>
  );
}

function useTouchUI() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(pointer: coarse)");
    const fine = window.matchMedia?.("(any-pointer: fine)");
    setTouch(!!mq?.matches || !fine?.matches);
    const seen = (e: PointerEvent) => {
      if (e.pointerType === "touch") setTouch(true);
    };
    window.addEventListener("pointerdown", seen, { passive: true });
    return () => window.removeEventListener("pointerdown", seen);
  }, []);
  return touch;
}

/** Menu sounds by delegation: hover ticks and click clacks on every enabled button. */
function useMenuSounds(game: GameApi) {
  useEffect(() => {
    let lastHover = 0;
    let lastEl: Element | null = null;
    const over = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest?.("button:not(:disabled), [role=tab], [role=switch]");
      if (!el || el === lastEl || el.closest("[data-silent]")) return;
      lastEl = el;
      const now = performance.now();
      if (now - lastHover < 45) return;
      lastHover = now;
      game.uiSound("hover");
    };
    const click = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("button:not(:disabled), [role=tab], [role=switch]");
      if (!el || el.closest("[data-silent]")) return;
      game.uiSound("click");
    };
    document.addEventListener("pointerover", over, true);
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("pointerover", over, true);
      document.removeEventListener("click", click, true);
    };
  }, [game]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller menu navigation: D-pad / left stick move focus between controls,
// A/✕ activates, B/○ goes back, LB/RB switch tabs, ←/→ adjust a focused slider.
// ─────────────────────────────────────────────────────────────────────────────

const FOCUSABLE = 'button:not([disabled]), [role="tab"], [role="switch"], [role="radio"], input:not([type="hidden"]):not([disabled])';

function navRoot(): HTMLElement | null {
  const modal = document.querySelector<HTMLElement>(".sc-modal");
  if (modal) return modal;
  const layers = document.querySelectorAll<HTMLElement>(".sc-menu-layer");
  return layers.length ? layers[layers.length - 1] : null;
}

function candidates(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  });
}

function moveFocus(dx: number, dy: number) {
  const root = navRoot();
  if (!root) return;
  const list = candidates(root);
  if (!list.length) return;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !list.includes(cur)) {
    const first = list.find((el) => el.matches(".sc-btn-primary, [aria-selected=true], [aria-checked=true]")) ?? list[0];
    first.focus();
    first.scrollIntoView({ block: "nearest", inline: "nearest" });
    return;
  }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    const along = (bx - ax) * dx + (by - ay) * dy;
    if (along <= 4) continue;
    const across = Math.abs((bx - ax) * dy - (by - ay) * dx);
    const score = along + across * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) {
    best.focus();
    best.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function nudgeRange(el: HTMLInputElement, dir: number) {
  const step = Number(el.step) || 1;
  const v = Math.max(Number(el.min), Math.min(Number(el.max), Number(el.value) + dir * step));
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, String(v));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function clickBack(game: GameApi) {
  const root = navRoot();
  if (root) {
    const back = root.querySelector<HTMLElement>('[aria-label="Back"], [aria-label="Done"], [aria-label="Close"]');
    if (back) return back.click();
    const cancel = Array.from(root.querySelectorAll<HTMLElement>("button")).find((b) => b.textContent?.trim() === "Cancel");
    if (cancel) return cancel.click();
  }
  if (game.hud.ask) return game.answer(null);
  if (game.phase === "pause") return game.resume();
  if (game.phase === "inventory") return game.toggleInventory();
}

function switchTab(dir: number) {
  const root = navRoot();
  const tabs = root ? Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]')) : [];
  if (tabs.length < 2) return;
  const cur = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
  const next = tabs[(Math.max(0, cur) + dir + tabs.length) % tabs.length];
  next.click();
  next.focus();
}

function useGamepadMenu(game: GameApi, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const edges = new PadEdges();
    edges.blockHeld(activePad()); // the press that opened this menu is not a menu press
    let raf = 0;
    let held = "";
    let nextRepeat = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const p = activePad();
      if (!p) return;
      const e = edges.update(p);
      const ls = stick(p.axes[0] ?? 0, p.axes[1] ?? 0, 0.5, 1);
      let dir = "";
      if (e.down(BTN.UP) || ls.y < -0.3) dir = "up";
      else if (e.down(BTN.DOWN) || ls.y > 0.3) dir = "down";
      else if (e.down(BTN.LEFT) || ls.x < -0.3) dir = "left";
      else if (e.down(BTN.RIGHT) || ls.x > 0.3) dir = "right";
      if (!dir) held = "";
      else if (dir !== held || t >= nextRepeat) {
        nextRepeat = t + (dir !== held ? 380 : 110);
        held = dir;
        document.documentElement.classList.add("pad-nav");
        const el = document.activeElement as HTMLElement | null;
        const range = el instanceof HTMLInputElement && el.type === "range";
        if (range && (dir === "left" || dir === "right")) nudgeRange(el as HTMLInputElement, dir === "left" ? -1 : 1);
        else moveFocus(dir === "left" ? -1 : dir === "right" ? 1 : 0, dir === "up" ? -1 : dir === "down" ? 1 : 0);
        game.uiSound("hover");
      }
      if (e.pressed(BTN.A)) {
        document.documentElement.classList.add("pad-nav");
        const el = document.activeElement as HTMLElement | null;
        const root = navRoot();
        if (el && root?.contains(el) && el.matches(FOCUSABLE)) {
          if (!(el instanceof HTMLInputElement && el.type !== "checkbox")) el.click();
          else if (el.form) el.form.requestSubmit();
        } else moveFocus(0, 0);
      }
      if (e.pressed(BTN.B)) clickBack(game);
      if (e.pressed(BTN.START) && game.phase === "pause") game.resume();
      if (e.pressed(BTN.LB)) switchTab(-1);
      if (e.pressed(BTN.RB)) switchTab(1);
    };
    raf = requestAnimationFrame(tick);
    const off = () => document.documentElement.classList.remove("pad-nav");
    window.addEventListener("pointermove", off, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", off);
    };
  }, [game, active]);
}

function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"sc-screen " + className}>{children}</div>;
}

function MenuButton({
  children,
  onClick,
  icon,
  variant = "",
  hint,
  disabled,
  autoFocus,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ReactNode;
  variant?: "" | "primary" | "danger" | "ghost" | "gold";
  hint?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <button className={"sc-btn sc-menu-btn" + (variant ? " sc-btn-" + variant : "")} onClick={onClick} disabled={disabled} autoFocus={autoFocus}>
      {icon && <span className="sc-btn-ic">{icon}</span>}
      <span className="sc-btn-label">
        {children}
        {hint && <small>{hint}</small>}
      </span>
    </button>
  );
}

function PanelHead({ eyebrow, title, onBack, backLabel = "Back", right }: { eyebrow?: string; title: string; onBack?: () => void; backLabel?: string; right?: ReactNode }) {
  return (
    <header className="sc-panel-head">
      {onBack && (
        <button className="sc-icon-btn" onClick={onBack} aria-label={backLabel}>
          <BackIcon size={22} />
        </button>
      )}
      <div className="sc-panel-titles">
        {eyebrow && <p className="sc-eyebrow">{eyebrow}</p>}
        <h2 className="sc-h2">{title}</h2>
      </div>
      {right}
    </header>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={on ? "sc-switch on" : "sc-switch"} onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="sc-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} className={value === o.id ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slider({ value, min, max, step, onChange, format, label }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; label: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="sc-slider">
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--pct" as string]: pct + "%" }} />
      <output>{format(value)}</output>
    </div>
  );
}

function Row({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return (
    <div className="sc-row">
      <div className="sc-row-text">
        <strong>{title}</strong>
        {detail && <span>{detail}</span>}
      </div>
      <div className="sc-row-ctl">{children}</div>
    </div>
  );
}

function timeAgo(ms: number) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : d + " days ago";
}

function modeOf(slot: WorldSlot) {
  return slot.flat ? "Baseplate" : slot.creative ? "Creative" : "Survival";
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlay router
// ─────────────────────────────────────────────────────────────────────────────

function Overlay({ game }: { game: GameApi }) {
  const [, poke] = useState(0);
  useEffect(() => game.subscribe(() => poke((n) => n + 1)), [game]);
  useMenuSounds(game);
  const touchUI = useTouchUI();
  const phase: Phase = game.phase;
  const hud = game.hud;
  useGamepadMenu(game, phase !== "play" || !!hud.ask || !!hud.signEdit);

  if (hud.fatal) return <FatalScreen title="The world hit a snag" detail={hud.fatal} />;

  return (
    <>
      {phase === "title" && <MainMenu game={game} />}
      {phase === "title" && hud.message && (
        <p className="sc-toast sc-toast-title" key={hud.message}>
          {hud.message}
        </p>
      )}
      {phase === "play" && !hud.hidden && <Hud game={game} touchUI={touchUI && !hud.padActive} />}
      {phase === "play" && touchUI && !hud.padActive && <TouchControls game={game} />}
      {phase === "play" && hud.signEdit && <SignEditor game={game} />}
      {phase === "pause" && <PauseMenu game={game} />}
      {phase === "inventory" && <Inventory game={game} />}
      {phase === "dead" && <DeathScreen game={game} />}
      {hud.ask && <AskDialog game={game} />}
      {phase === "play" && hud.loading > 0 && (
        <div className="sc-loading" role="status">
          <Logo small />
          <div className="sc-boot-bar">
            <span style={{ width: Math.round((1 - hud.loading) * 100) + "%" }} />
          </div>
          <p className="sc-muted">Building the land around you…</p>
        </div>
      )}
      <div className="sc-veil sc-veil-flash" style={{ opacity: hud.flash * 0.4 }} />
      <div className="sc-veil sc-veil-water" style={{ opacity: hud.eyeWater ? 1 : 0 }} />
      <div className="sc-veil sc-veil-hurt" style={{ opacity: phase === "play" ? Math.max(hud.hurtDir, !hud.creative && hud.health > 0 && hud.health <= 6 ? 0.35 : 0) : 0 }} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main menu
// ─────────────────────────────────────────────────────────────────────────────

const TIPS = [
  "Hold a torch near ore: rare studs hum when they're close.",
  "A bed resets your spawn — and skips the night.",
  "Shift + click moves a whole stack into the hotbar.",
  "Hamlets restock twice a day. Keep your name clean there.",
  "A beacon on a full iron pyramid keeps you fast.",
  "Creepers hate cats. Cats don't care.",
  "Third-person view: F5. Hide the HUD: F1.",
];

type MenuScreen = "home" | "worlds" | "create" | "settings" | "help";

function MainMenu({ game }: { game: GameApi }) {
  const [screen, setScreen] = useState<MenuScreen>("home");
  const slots = game.slots;
  const last = slots[0];
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const go = (s: MenuScreen) => {
    game.uiSound("open");
    setScreen(s);
  };
  return (
    <div className="sc-menu-layer sc-title">
      <div className="sc-title-shade" />
      {screen === "home" && (
        <Screen className="sc-home">
          <Logo />
          <p className="sc-tagline">An infinite world of studs, seeds and stubborn creepers.</p>
          <nav className="sc-menu-col" aria-label="Main menu">
            {last && (
              <MenuButton variant="primary" icon={<PlayIcon size={22} />} onClick={() => game.enter("continue", last.id)} hint={modeOf(last) + " · seed " + last.seedText + " · " + timeAgo(last.updated)} autoFocus>
                Continue
              </MenuButton>
            )}
            <MenuButton variant={last ? "" : "primary"} icon={last ? <BookIcon size={22} /> : <PlayIcon size={22} />} onClick={() => go(slots.length ? "worlds" : "create")} autoFocus={!last}>
              {slots.length ? "Worlds" : "Play"}
            </MenuButton>
            {slots.length > 0 && (
              <MenuButton icon={<PlusIcon size={22} />} onClick={() => go("create")}>
                New world
              </MenuButton>
            )}
            <MenuButton icon={<GearIcon size={22} />} onClick={() => go("settings")}>
              Settings
            </MenuButton>
            <MenuButton icon={<ControllerIcon size={22} />} onClick={() => go("help")}>
              How to play
            </MenuButton>
          </nav>
          <footer className="sc-home-foot">
            <span className="sc-chip">v{VERSION}</span>
            <span className="sc-tip">
              <StarIcon size={14} /> {tip}
            </span>
          </footer>
        </Screen>
      )}
      {screen === "worlds" && <WorldList game={game} onBack={() => setScreen("home")} onCreate={() => go("create")} />}
      {screen === "create" && <CreateWorld game={game} onBack={() => setScreen(slots.length ? "worlds" : "home")} />}
      {screen === "settings" && (
        <Screen className="sc-wide">
          <SettingsPanel game={game} onBack={() => setScreen("home")} />
        </Screen>
      )}
      {screen === "help" && (
        <Screen className="sc-wide">
          <HelpPanel onBack={() => setScreen("home")} />
        </Screen>
      )}
    </div>
  );
}

function WorldList({ game, onBack, onCreate }: { game: GameApi; onBack: () => void; onCreate: () => void }) {
  const [confirm, setConfirm] = useState("");
  const slots = game.slots;
  return (
    <Screen className="sc-wide">
      <section className="sc-panel sc-panel-tall">
        <PanelHead
          eyebrow="Singleplayer"
          title="Your worlds"
          onBack={onBack}
          right={
            <button className="sc-btn sc-btn-primary sc-btn-sm" onClick={onCreate}>
              <PlusIcon size={18} /> New
            </button>
          }
        />
        <ul className="sc-world-list">
          {slots.map((slot) => (
            <li key={slot.id} className="sc-world-card">
              <button className="sc-world-main" onClick={() => game.enter("continue", slot.id)}>
                <span className={"sc-world-badge sc-mode-" + modeOf(slot).toLowerCase()}>{modeOf(slot)[0]}</span>
                <span className="sc-world-text">
                  <strong>Seed {slot.seedText}</strong>
                  <small>
                    {modeOf(slot)} · played {timeAgo(slot.updated)}
                  </small>
                </span>
                <span className="sc-world-play">
                  <PlayIcon size={18} />
                </span>
              </button>
              {confirm === slot.id ? (
                <div className="sc-world-confirm">
                  <button className="sc-btn sc-btn-danger sc-btn-sm" onClick={() => { game.deleteSlot(slot.id); setConfirm(""); }}>
                    Delete
                  </button>
                  <button className="sc-btn sc-btn-sm" onClick={() => setConfirm("")}>
                    Keep
                  </button>
                </div>
              ) : (
                <button className="sc-icon-btn sc-world-del" aria-label={"Delete world " + slot.seedText} onClick={() => setConfirm(slot.id)}>
                  <TrashIcon size={18} />
                </button>
              )}
            </li>
          ))}
          {slots.length === 0 && <li className="sc-empty">No worlds yet. Make one.</li>}
        </ul>
      </section>
    </Screen>
  );
}

function CreateWorld({ game, onBack }: { game: GameApi; onBack: () => void }) {
  const [seed, setSeed] = useState(() => {
    try {
      return sessionStorage.getItem("studcraft-pending-seed") || String((Math.random() * 1e9) | 0);
    } catch {
      return String((Math.random() * 1e9) | 0);
    }
  });
  const [mode, setMode] = useState<EnterKind>("survival");
  useEffect(() => {
    try {
      sessionStorage.setItem("studcraft-pending-seed", seed);
    } catch {
      /* private mode */
    }
  }, [seed]);
  const mods = game.settings.mods;
  const modes: { id: EnterKind; name: string; text: string; tone: string }[] = [
    { id: "survival", name: "Survival", text: "Mine, craft, eat, rank up. Nights bite back.", tone: "red" },
    { id: "play", name: "Creative", text: "Every brick, no limits. Double-tap jump to fly.", tone: "blue" },
    { id: "flat", name: "Baseplate", text: "A flat creative pad to build on.", tone: "green" },
  ];
  return (
    <Screen className="sc-wide">
      <section className="sc-panel sc-panel-tall">
        <PanelHead eyebrow="New world" title="Shape your land" onBack={onBack} />
        <div className="sc-scroll">
          <label className="sc-field">
            <span className="sc-label">Seed</span>
            <div className="sc-seed">
              <input type="text" value={seed} maxLength={48} spellCheck={false} aria-label="World seed" onChange={(e) => setSeed(e.target.value)} />
              <button className="sc-btn sc-btn-gold sc-btn-sm" onClick={() => setSeed(String((Math.random() * 1e9) | 0))} aria-label="Random seed">
                <DiceIcon size={18} /> Roll
              </button>
            </div>
            <small className="sc-muted">Words or numbers. The same seed always builds the same hills, ores and hamlets.</small>
          </label>
          <p className="sc-label">Mode</p>
          <div className="sc-mode-grid" role="radiogroup" aria-label="Game mode">
            {modes.map((m) => (
              <button key={m.id} role="radio" aria-checked={mode === m.id} className={"sc-mode-card tone-" + m.tone + (mode === m.id ? " on" : "")} onClick={() => setMode(m.id)}>
                <strong>{m.name}</strong>
                <span>{m.text}</span>
                {mode === m.id && (
                  <i className="sc-mode-check">
                    <CheckIcon size={16} />
                  </i>
                )}
              </button>
            ))}
          </div>
          <p className="sc-label">World rules</p>
          <div className="sc-rows">
            <Row title="Hard nights" detail="Hostiles hit harder and come in bigger packs.">
              <Toggle label="Hard nights" on={mods.hard} onChange={(v) => game.setMod("hard", v)} />
            </Row>
            <Row title="Generous parts" detail="More drops from blocks and mobs.">
              <Toggle label="Generous parts" on={mods.generous} onChange={(v) => game.setMod("generous", v)} />
            </Row>
            <Row title="Peaceful" detail="No hostile mobs spawn.">
              <Toggle label="Peaceful" on={mods.peaceful} onChange={(v) => game.setMod("peaceful", v)} />
            </Row>
            <Row title="Spellcraft" detail="Mana, tomes and the Mage skill branch.">
              <Toggle label="Spellcraft" on={mods.spells} onChange={(v) => game.setMod("spells", v)} />
            </Row>
          </div>
        </div>
        <footer className="sc-panel-foot">
          <button
            className="sc-btn sc-btn-primary sc-btn-wide"
            onClick={() => {
              game.setSeed(seed.trim() || String((Math.random() * 1e9) | 0));
              game.enter(mode);
            }}
          >
            <PlayIcon size={20} /> Create world
          </button>
        </footer>
      </section>
    </Screen>
  );
}

function HelpPanel({ onBack }: { onBack: () => void }) {
  const keysList: [string, string][] = [
    ["W A S D", "Move"],
    ["Mouse", "Look"],
    ["Left click (hold)", "Mine / attack"],
    ["Right click", "Place / use"],
    ["Space", "Jump · double-tap to fly in Creative"],
    ["Shift", "Sneak · block with a shield"],
    ["Ctrl", "Sprint"],
    ["1–9 · wheel", "Pick hotbar slot"],
    ["E", "Inventory & crafting"],
    ["Q", "Cycle spells (with a tome)"],
    ["F", "Swap off-hand"],
    ["Middle click", "Pick block"],
    ["F5 · F1", "Third person · hide HUD"],
    ["Esc", "Pause"],
  ];
  const padList: [string, string][] = [
    ["LS · RS", "Move · look"],
    ["A · ✕", "Jump"],
    ["RT · R2", "Mine / attack"],
    ["LT · L2", "Place / use"],
    ["LB RB · L1 R1", "Hotbar"],
    ["X · □", "Inventory"],
    ["Y · △", "Swap off-hand"],
    ["B · ○ / R3", "Sneak (hold)"],
    ["L3", "Sprint"],
    ["D-pad ↑ · ↓", "Third person · spells"],
    ["Menu · Options", "Pause"],
    ["In menus", "D-pad moves · A selects · B back · LB/RB tabs"],
  ];
  return (
    <section className="sc-panel sc-panel-tall">
      <PanelHead eyebrow="Guide" title="How to play" onBack={onBack} />
      <div className="sc-scroll sc-help">
        <div className="sc-help-grid">
          <div>
            <p className="sc-label">Keyboard & mouse</p>
            <dl className="sc-keys">
              {keysList.map(([k, v]) => (
                <div key={k}>
                  <dt>
                    <kbd>{k}</kbd>
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="sc-label">Controller (Xbox · PlayStation)</p>
            <dl className="sc-keys">
              {padList.map(([k, v]) => (
                <div key={k}>
                  <dt>
                    <kbd>{k}</kbd>
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="sc-label">Touch</p>
            <ul className="sc-bullets">
              <li>Left thumb: drag anywhere on the left to walk.</li>
              <li>Right side: drag the screen to look.</li>
              <li>Hold the pick to mine or attack, the hand to place or use.</li>
              <li>Swipe along the hotbar to pick, drag between slots to swap.</li>
            </ul>
            <p className="sc-label">First night</p>
            <ul className="sc-bullets">
              <li>Punch a tree for logs, turn them into planks, then a workbench.</li>
              <li>Build a pick, dig into a hill, find coal for torches.</li>
              <li>Hamlets trade and hand out quests. A ruined gate near the first one opens the Nether.</li>
              <li>Ranks come from mining rare studs, smelting and fighting. Each level is a skill point.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings (title + pause)
// ─────────────────────────────────────────────────────────────────────────────

type SettingsTab = "graphics" | "controls" | "audio" | "world";

function SettingsPanel({ game, onBack }: { game: GameApi; onBack: () => void }) {
  const [tab, setTab] = useState<SettingsTab>("graphics");
  const s = game.settings;
  const tabs: { id: SettingsTab; label: string; icon: ReactNode }[] = [
    { id: "graphics", label: "Graphics", icon: <EyeIcon size={18} /> },
    { id: "controls", label: "Controls", icon: <ControllerIcon size={18} /> },
    { id: "audio", label: "Audio", icon: <SoundIcon size={18} /> },
    { id: "world", label: "World", icon: <GlobeIcon size={18} /> },
  ];
  return (
    <section className="sc-panel sc-panel-tall sc-settings">
      <PanelHead eyebrow="Options" title="Settings" onBack={onBack} backLabel="Done" />
      <div className="sc-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="sc-scroll sc-rows" role="tabpanel">
        {tab === "graphics" && (
          <>
            <Row title="Quality" detail="Shadows, draw distance cap and anti-aliasing. Auto adapts to your device.">
              <Segmented<Quality>
                label="Quality"
                value={s.quality}
                onChange={(q) => game.setQuality(q)}
                options={[
                  { id: "auto", label: "Auto" },
                  { id: "high", label: "High" },
                  { id: "balanced", label: "Balanced" },
                  { id: "performance", label: "Fast" },
                ]}
              />
            </Row>
            <Row title="Upscaling" detail={"Renders the 3D world at a lower resolution and rebuilds sharp edges (EASU + RCAS). " + (game.hud.renderRes ? "Now: " + game.hud.renderRes : "")}>
              <Segmented<Upscale>
                label="Upscaling"
                value={s.upscale}
                onChange={(u) => game.setUpscale(u)}
                options={[
                  { id: "auto", label: "Auto" },
                  { id: "native", label: "Native" },
                  { id: "quality", label: "Quality" },
                  { id: "balanced", label: "Balanced" },
                  { id: "performance", label: "Perf." },
                ]}
              />
            </Row>
            <Row title="Sharpness" detail="Contrast-adaptive sharpening after the upscale.">
              <Slider label="Sharpness" value={s.sharpness} min={0} max={1} step={0.05} onChange={(v) => game.setSharpness(v)} format={(v) => Math.round(v * 100) + "%"} />
            </Row>
            <Row title="Render distance" detail="How far chunks draw. The world itself never ends.">
              <Slider label="Render distance" value={s.radius} min={2} max={14} step={1} onChange={(v) => game.setRadius(v)} format={(v) => v + " chunks"} />
            </Row>
            <Row title="Field of view">
              <Slider label="Field of view" value={s.fov} min={55} max={100} step={1} onChange={(v) => game.setFov(v)} format={(v) => v + "°"} />
            </Row>
            <Row title="Realistic lighting" detail="Soft sun shadows, plastic sheen, volumetric clouds.">
              <Toggle label="Realistic lighting" on={s.realistic} onChange={(v) => game.setRealistic(v)} />
            </Row>
            <Row title="Studs on blocks" detail="Real cylindrical studs on every top face.">
              <Toggle label="Studs" on={s.studs} onChange={(v) => game.setStuds(v)} />
            </Row>
            <Row title="FPS counter">
              <Toggle label="FPS counter" on={s.showFps} onChange={(v) => game.setShowFps(v)} />
            </Row>
            <Row title="Graphics adapter" detail={game.hud.gpuWarn || "Rendering on the GPU (high-performance requested)."}>
              <span className="sc-status">{game.hud.gpu || "detecting…"}</span>
            </Row>
          </>
        )}
        {tab === "controls" && (
          <>
            <Row title="Look sensitivity">
              <Slider label="Look sensitivity" value={s.sens} min={0.3} max={2.5} step={0.05} onChange={(v) => game.setSens(v)} format={(v) => v.toFixed(2) + "×"} />
            </Row>
            <Row title="Third-person view" detail="Also F5 on a keyboard.">
              <Toggle label="Third-person view" on={s.third} onChange={(v) => game.setThird(v)} />
            </Row>
            <Row title="Vibration" detail="Touch buttons on phones and controller rumble.">
              <Toggle label="Vibration" on={s.haptics} onChange={(v) => game.setHaptics(v)} />
            </Row>
            <Row title="Controller" detail={game.hud.pad ? game.hud.pad + " connected — Xbox, PlayStation, Switch Pro and most Bluetooth pads work." : "Plug in or pair an Xbox, PlayStation or Switch Pro controller, then press any button."}>
              <span className={"sc-chip" + (game.hud.pad ? " rep good" : "")}>{game.hud.pad ? "Ready" : "None"}</span>
            </Row>
            <Row title="Invert look (controller)" detail="Right stick up looks down.">
              <Toggle label="Invert look" on={s.invertY} onChange={(v) => game.setInvertY(v)} />
            </Row>
            <Row title="Move stick dead zone" detail="Raise it if the left stick drifts on its own; lower it for a touchier stick.">
              <Slider label="Left stick dead zone" value={s.deadL} min={0.02} max={0.4} step={0.01} onChange={(v) => game.setDead("left", v)} format={(v) => Math.round(v * 100) + "%"} />
            </Row>
            <Row title="Look stick dead zone" detail="Raise it if the camera creeps on its own; lower it for finer aim.">
              <Slider label="Right stick dead zone" value={s.deadR} min={0.02} max={0.4} step={0.01} onChange={(v) => game.setDead("right", v)} format={(v) => Math.round(v * 100) + "%"} />
            </Row>
            <Row title="Adaptive triggers (DualSense)" detail={game.dsState() === "unavailable" ? "Needs Chrome or Edge on PC with a PlayStation DualSense — the browser picker opens when you turn it on. Not available on phones or in the app." : "R2 stiffens as the block cracks while you mine; L2 gets a bow wall. Turning it on opens the browser's controller picker."}>
              {game.dsState() === "unavailable" ? (
                <span className="sc-chip">PC + Chrome/Edge only</span>
              ) : (
                <>
                  <Toggle label="Adaptive triggers" on={s.adaptive} onChange={(v) => game.setAdaptive(v)} />
                  <span className={"sc-chip" + (game.dsState() === "connected" ? " rep good" : "")}>{game.dsState() === "connected" ? "DualSense linked" : "Not linked"}</span>
                </>
              )}
            </Row>
          </>
        )}
        {tab === "audio" && (
          <>
            <Row title="Sound">
              <Toggle label="Sound" on={s.sound} onChange={(v) => game.setSound(v)} />
            </Row>
            <Row title="Music">
              <Slider label="Music volume" value={s.music} min={0} max={1} step={0.05} onChange={(v) => game.setMusic(v)} format={(v) => Math.round(v * 100) + "%"} />
            </Row>
            <Row title="Effects">
              <Slider label="Effects volume" value={s.sfx} min={0} max={1} step={0.05} onChange={(v) => game.setSfx(v)} format={(v) => Math.round(v * 100) + "%"} />
            </Row>
          </>
        )}
        {tab === "world" && (
          <>
            <Row title="Hard nights" detail="Hostiles hit harder and come in bigger packs.">
              <Toggle label="Hard nights" on={s.mods.hard} onChange={(v) => game.setMod("hard", v)} />
            </Row>
            <Row title="Generous parts" detail="More drops from blocks and mobs.">
              <Toggle label="Generous parts" on={s.mods.generous} onChange={(v) => game.setMod("generous", v)} />
            </Row>
            <Row title="Peaceful" detail="No hostile mobs spawn.">
              <Toggle label="Peaceful" on={s.mods.peaceful} onChange={(v) => game.setMod("peaceful", v)} />
            </Row>
            <Row title="Spellcraft" detail="Mana, tomes and the Mage skill branch.">
              <Toggle label="Spellcraft" on={s.mods.spells} onChange={(v) => game.setMod("spells", v)} />
            </Row>
          </>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pause / death / dialogs
// ─────────────────────────────────────────────────────────────────────────────

function CataloguePanel({ game }: { game: GameApi }) {
  const [list, setList] = useState(() => game.catalogueList());
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const refresh = () => setList(game.catalogueList());
  return (
    <div>
      <p className="sc-muted">
        Your saved Teks builds. The catalogue lives outside your worlds — deleting a world never deletes a model. Loading places the parts you own
        in front of you; the rest appear as holograms to complete when you have them.
      </p>
      <nav className="sc-menu-col">
        {list.map((m) => (
          <div key={m.name} className="sc-cat-row">
            <span className="sc-cat-name">
              <strong>{m.name}</strong> <small>{m.parts} parts{m.builtin ? " · built-in" : ""}</small>
            </span>
            <button className="sc-chip-btn" onClick={() => { game.catalogueLoad(m.name); setMsg("Loaded “" + m.name + "” — resume and look in front of you"); }}>
              Load
            </button>
            <button className="sc-chip-btn" onClick={() => setCode(game.catalogueExport(m.name))}>
              Share code
            </button>
            {!m.builtin && (
              <button className="sc-chip-btn" onClick={() => { game.catalogueDelete(m.name); refresh(); }}>
                Delete
              </button>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="sc-empty">No models yet — build something from Teks parts, aim at it, then save it below.</p>}
      </nav>
      <div className="sc-cat-save">
        <input className="sc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Model name" />
        <button className="sc-chip-btn" disabled={!name.trim()} onClick={() => { game.catalogueSave(name.trim()); refresh(); setMsg("Saved “" + name.trim() + "”"); }}>
          Save aimed / driven build
        </button>
      </div>
      <div className="sc-cat-save">
        <textarea className="sc-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="A model's share code appears here — paste one to import it" rows={3} />
        <button
          className="sc-chip-btn"
          onClick={() => {
            if (game.catalogueImport(code)) { refresh(); setMsg("Model imported"); } else setMsg("That code is not a Studs model");
          }}
        >
          Import code
        </button>
      </div>
      {msg && <p className="sc-status">{msg}</p>}
    </div>
  );
}

function PauseMenu({ game }: { game: GameApi }) {
  const [view, setView] = useState<"main" | "settings" | "online" | "catalogue">("main");
  const hud = game.hud;
  const [copied, setCopied] = useState(false);
  return (
    <div className="sc-menu-layer sc-pause">
      {view === "main" && (
        <Screen className="sc-pause-screen">
          <section className="sc-panel sc-pause-card">
            <p className="sc-eyebrow">Game paused</p>
            <Logo small />
            <nav className="sc-menu-col">
              <MenuButton variant="primary" icon={<PlayIcon size={22} />} onClick={() => game.resume()} autoFocus>
                Resume
              </MenuButton>
              <MenuButton icon={<BagIcon size={22} />} onClick={() => game.toggleInventory()}>
                Inventory
              </MenuButton>
              <MenuButton icon={<BookIcon size={22} />} onClick={() => setView("catalogue")}>
                Vehicle catalogue
              </MenuButton>
              <MenuButton icon={<GearIcon size={22} />} onClick={() => setView("settings")}>
                Settings
              </MenuButton>
              <MenuButton icon={<GlobeIcon size={22} />} onClick={() => setView("online")} hint={hud.netStatus || "Prototype"}>
                Online room
              </MenuButton>
              <MenuButton variant="ghost" icon={<ExitIcon size={22} />} onClick={() => game.quit()}>
                Save & quit to title
              </MenuButton>
            </nav>
          </section>
          <aside className="sc-panel sc-pause-info">
            <p className="sc-label">This world</p>
            <dl className="sc-facts">
              <div>
                <dt>Seed</dt>
                <dd>
                  {hud.seedText || hud.seed}
                  <button
                    className="sc-icon-btn sc-icon-sm"
                    aria-label="Copy seed"
                    onClick={() => {
                      game.copySeed();
                      setCopied(true);
                    }}
                  >
                    {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                  </button>
                </dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{hud.flat ? "Baseplate" : hud.creative ? "Creative" : "Survival"}</dd>
              </div>
              <div>
                <dt>Realm</dt>
                <dd>{hud.realm}</dd>
              </div>
              <div>
                <dt>Position</dt>
                <dd>
                  {Math.floor(hud.x)}, {Math.floor(hud.y)}, {Math.floor(hud.z)}
                </dd>
              </div>
              <div>
                <dt>Rank</dt>
                <dd>
                  Lv {hud.level} · {hud.rank}
                </dd>
              </div>
              {hud.questTrack && (
                <div>
                  <dt>Quest</dt>
                  <dd>{hud.questTrack}</dd>
                </div>
              )}
            </dl>
          </aside>
        </Screen>
      )}
      {view === "settings" && (
        <Screen className="sc-wide">
          <SettingsPanel game={game} onBack={() => setView("main")} />
        </Screen>
      )}
      {view === "catalogue" && (
        <Screen>
          <section className="sc-panel">
            <PanelHead eyebrow="Teks" title="Vehicle catalogue" onBack={() => setView("main")} />
            <CataloguePanel game={game} />
          </section>
        </Screen>
      )}
      {view === "online" && (
        <Screen>
          <section className="sc-panel">
            <PanelHead eyebrow="Prototype" title="Online room" onBack={() => setView("main")} />
            <p className="sc-muted">Play in the same seed with friends through a relay server. Block edits and positions sync; mobs stay local.</p>
            {hud.netStatus ? (
              <>
                <p className="sc-status">{hud.netStatus}</p>
                <MenuButton variant="danger" icon={<ExitIcon size={22} />} onClick={() => game.leaveOnline()}>
                  Leave the room
                </MenuButton>
              </>
            ) : (
              <nav className="sc-menu-col">
                <MenuButton variant="primary" icon={<GlobeIcon size={22} />} onClick={() => game.hostOnline()}>
                  Host a room
                </MenuButton>
                <MenuButton icon={<PlusIcon size={22} />} onClick={() => game.joinOnline()}>
                  Join with a code
                </MenuButton>
              </nav>
            )}
          </section>
        </Screen>
      )}
    </div>
  );
}

function DeathScreen({ game }: { game: GameApi }) {
  return (
    <div className="sc-menu-layer sc-death">
      <Screen>
        <section className="sc-death-card">
          <p className="sc-eyebrow">You crumbled</p>
          <h1 className="sc-death-title">Scattered</h1>
          <p className="sc-muted">Your bricks lie where you fell. Run back before they despawn.</p>
          <nav className="sc-menu-col">
            <MenuButton variant="primary" icon={<PlayIcon size={22} />} onClick={() => game.respawn()} autoFocus>
              Respawn
            </MenuButton>
            <MenuButton variant="ghost" icon={<ExitIcon size={22} />} onClick={() => game.quit()}>
              Save & quit to title
            </MenuButton>
          </nav>
        </section>
      </Screen>
    </div>
  );
}

function AskDialog({ game }: { game: GameApi }) {
  const ask = game.hud.ask!;
  const [text, setText] = useState(ask.value);
  useEffect(() => setText(ask.value), [ask]);
  return (
    <div className="sc-modal" role="dialog" aria-modal="true" aria-label={ask.title}>
      <form
        className="sc-panel sc-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          game.answer(text);
        }}
      >
        <h2 className="sc-h2">{ask.title}</h2>
        {ask.hint && <p className="sc-muted">{ask.hint}</p>}
        <input className="sc-input" type="text" value={text} autoFocus maxLength={64} spellCheck={false} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Escape" && game.answer(null)} />
        <div className="sc-dialog-actions">
          <button type="button" className="sc-btn" onClick={() => game.answer(null)}>
            Cancel
          </button>
          <button type="submit" className="sc-btn sc-btn-primary">
            OK
          </button>
        </div>
      </form>
    </div>
  );
}

function SignEditor({ game }: { game: GameApi }) {
  const at = game.hud.signEdit;
  const [text, setText] = useState(at?.text ?? "");
  if (!at) return null;
  return (
    <div className="sc-modal" role="dialog" aria-modal="true" aria-label="Write on the sign">
      <form
        className="sc-panel sc-dialog sc-sign"
        onSubmit={(e) => {
          e.preventDefault();
          game.setSignText(text);
        }}
      >
        <h2 className="sc-h2">Write on the sign</h2>
        <input className="sc-input sc-sign-input" type="text" value={text} maxLength={60} spellCheck={false} aria-label="Sign text" autoFocus onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Escape" && game.cancelSignEdit()} />
        <div className="sc-dialog-actions">
          <button type="button" className="sc-btn" onClick={() => game.cancelSignEdit()}>
            Cancel
          </button>
          <button type="submit" className="sc-btn sc-btn-primary">
            Carve it
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────────────────────────

function TimeGlyph({ label, weather }: { label: string; weather: string }) {
  if (weather === "storm") return <BoltIcon size={16} />;
  if (weather === "rain") return <RainIcon size={16} />;
  if (weather === "cloudy") return <CloudIcon size={16} />;
  return label === "Night" || label === "Dusk" || label === "Midnight" ? <MoonIcon size={16} /> : <SunIcon size={16} />;
}

function ClockWidget({ hud }: { hud: GameApi["hud"] }) {
  // Rotate celestial dial so Sun is at top (12 o'clock) at noon (0.25).
  // Formula: (timeProgress - 0.25) * 360 degrees
  const dialRotation = (((hud.timeProgress ?? 0) - 0.25) * 360).toFixed(1);
  const phaseClass = (hud.timeLabel || "day").toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="sc-clock-card" title={`Time: ${hud.timeClock} · Day ${hud.dayCount}`}>
      <div className="sc-clock-dial-bezel">
        <div className="sc-clock-dial" style={{ transform: `rotate(${dialRotation}deg)` }}>
          <svg viewBox="0 0 64 64" className="sc-clock-svg" aria-hidden="true">
            <defs>
              <linearGradient id="scSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2c7be5" />
                <stop offset="48%" stopColor="#70b5f9" />
                <stop offset="52%" stopColor="#141c2e" />
                <stop offset="100%" stopColor="#040814" />
              </linearGradient>
            </defs>
            {/* Celestial Sky Disc */}
            <circle cx="32" cy="32" r="30" fill="url(#scSkyGrad)" />
            {/* Day: 3D STUDS Sun with golden studs */}
            <g transform="translate(32, 11)">
              <circle cx="0" cy="0" r="7.5" fill="#ffd13b" stroke="#e89812" strokeWidth="1.2" />
              <circle cx="-2" cy="-2" r="2.8" fill="#fff9d6" opacity="0.65" />
              <circle cx="0" cy="-9" r="1.6" fill="#f5aa18" />
              <circle cx="0" cy="9" r="1.6" fill="#f5aa18" />
              <circle cx="-9" cy="0" r="1.6" fill="#f5aa18" />
              <circle cx="9" cy="0" r="1.6" fill="#f5aa18" />
            </g>
            {/* Night: Crescent STUDS Moon with micro-craters */}
            <g transform="translate(32, 53)">
              <circle cx="0" cy="0" r="7" fill="#dce6f4" stroke="#889bb8" strokeWidth="1" />
              <circle cx="3" cy="-1.5" r="5.8" fill="#141c2e" />
              <circle cx="-2.5" cy="1.5" r="1.2" fill="#9db1ce" opacity="0.8" />
              <circle cx="-1" cy="-3" r="0.9" fill="#9db1ce" opacity="0.7" />
              <circle cx="16" cy="3" r="0.8" fill="#ffffff" opacity="0.85" />
              <circle cx="-15" cy="-2" r="0.8" fill="#ffffff" opacity="0.85" />
              <circle cx="12" cy="-10" r="0.6" fill="#ffffff" opacity="0.7" />
            </g>
          </svg>
        </div>
        {/* STUDS Stud Accents on Gold Bezel */}
        <div className="sc-clock-stud stud-t" />
        <div className="sc-clock-stud stud-r" />
        <div className="sc-clock-stud stud-b" />
        <div className="sc-clock-stud stud-l" />
      </div>
      <div className="sc-clock-meta">
        <div className="sc-clock-top">
          <span className="sc-clock-time">{hud.timeClock || "07:00 AM"}</span>
          <span className={`sc-clock-phase phase-${phaseClass}`}>{hud.timeLabel || "Day"}</span>
        </div>
        <div className="sc-clock-sub">
          <span className="sc-clock-day">Day {hud.dayCount || 1}</span>
          <span className="sc-clock-divider">·</span>
          <span className="sc-clock-ticks">{((hud.timeTicks ?? 0).toLocaleString())} ticks</span>
        </div>
      </div>
    </div>
  );
}

function Hud({ game, touchUI }: { game: GameApi; touchUI: boolean }) {
  const hud = game.hud;
  const s = game.settings;
  const armorPts = useMemo(() => {
    let sum = 0;
    for (const id of hud.armor) if (id > 0) sum += def(id).armor;
    return Math.max(0, Math.min(20, Math.round(sum / 0.024)));
  }, [hud.armor]);
  const effects = hud.effect ? hud.effect.split(" ").filter(Boolean) : [];
  return (
    <div className={"sc-hud" + (touchUI ? " is-touch" : "")}>
      <div className="sc-hud-tl">
        <ClockWidget hud={hud} />
        <div className="sc-info">
          <span className="sc-info-ic">
            <TimeGlyph label={hud.timeLabel} weather={hud.weather} />
          </span>
          <span>
            <strong>{hud.biome}</strong>
            <small>
              {hud.weather !== "clear" ? `${hud.weather.toUpperCase()} · ` : ""}
              {hud.realm !== "Overworld" ? hud.realm : "Overworld"}
              {hud.flying ? " · flying" : ""}
              {hud.hammer ? " · hammer" : ""}
            </small>
          </span>
        </div>
        <div className="sc-coords">
          {Math.floor(hud.x)} / {Math.floor(hud.y)} / {Math.floor(hud.z)}
        </div>
      </div>
      {hud.gpuWarn && <div className="sc-toast" role="alert" style={{ top: 8, bottom: "auto", maxWidth: 560 }}>⚠ {hud.gpuWarn}</div>}
      <div className="sc-hud-tr">
        {s.showFps && <div className="sc-fps">{hud.fps} FPS · {hud.gpu}</div>}
        {hud.questTrack && !hud.creative && (
          <div className={"sc-quest" + (hud.questAlert ? " ready" : "")}>
            <ScrollIcon size={16} />
            <span>{hud.questTrack}</span>
          </div>
        )}
        {hud.netStatus && <div className="sc-quest">{hud.netStatus}</div>}
        {effects.length > 0 && (
          <div className="sc-effects">
            {effects.map((e) => (
              <span key={e} className={"sc-effect fx-" + e.toLowerCase()}>
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
      {hud.boss && (
        <div className="sc-boss" role="status">
          <strong>{hud.boss}</strong>
          <div className="sc-boss-bar">
            <span style={{ width: `${Math.round(hud.bossHp * 100)}%` }} className={hud.bossHp < 0.35 ? "low" : ""} />
          </div>
        </div>
      )}
      {hud.message && (
        <p className="sc-toast" key={hud.message}>
          {hud.message}
        </p>
      )}
      {hud.won && <p className="sc-banner">The End is yours</p>}
      <div className={"sc-cross" + (hud.targetName ? " on-target" : "")} aria-hidden="true">
        {hud.mine > 0 && (
          <svg className="sc-mine-ring" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" pathLength={100} strokeDasharray={`${Math.round(hud.mine * 100)} 100`} />
          </svg>
        )}
      </div>
      {hud.targetName && <div className="sc-target">{hud.targetName}</div>}
      {!touchUI && !hud.locked && !hud.padActive && (
        <button
          className="sc-capture"
          onClick={() => {
            try {
              const p = game.canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
              p?.catch?.(() => {});
            } catch {
              /* refused */
            }
          }}
        >
          Click to play
        </button>
      )}
      <div className="sc-hud-bottom">
        {hud.spellsOn && hud.spell && (
          <div className="sc-mana" aria-label={`${hud.spell}, ${Math.floor(hud.mana)} mana`}>
            <span style={{ width: `${Math.min(100, (hud.mana / Math.max(1, hud.manaMax)) * 100)}%` }} />
            <em>
              {hud.spell} · {Math.floor(hud.mana)}/{hud.manaMax}
            </em>
          </div>
        )}
        {!hud.creative && (
          <div className="sc-vitals">
            <div className="sc-vital-col">
              {armorPts > 0 && <IconRow kind="armor" value={armorPts} />}
              <IconRow kind="heart" value={hud.health} pulse={hud.health <= 6} />
            </div>
            <div className="sc-vital-col right">
              {hud.oxygen < 10 && (
                <div className="sc-icon-row">
                  {Array.from({ length: 10 }, (_, i) => (
                    <BubbleIcon key={i} size={touchUI ? 13 : 16} on={i < Math.ceil(hud.oxygen)} />
                  ))}
                </div>
              )}
              <IconRow kind="food" value={hud.hunger} right />
            </div>
          </div>
        )}
        <div className="sc-xp" aria-label={`${hud.rank}, level ${hud.level}`}>
          <span style={{ width: `${Math.min(100, (hud.xp / Math.max(1, hud.xpNeed)) * 100)}%` }} />
          <b>{hud.creative ? "Creative" : hud.level}</b>
        </div>
        <Hotbar game={game} />
      </div>
    </div>
  );
}

function IconRow({ kind, value, right = false, pulse = false }: { kind: "heart" | "food" | "armor"; value: number; right?: boolean; pulse?: boolean }) {
  const icons = Array.from({ length: 10 }, (_, i) => {
    const idx = right ? 9 - i : i;
    const full = value >= (idx + 1) * 2;
    const half = !full && value >= idx * 2 + 1;
    const f = (full ? 1 : half ? 0.5 : 0) as 0 | 0.5 | 1;
    if (kind === "heart") return <HeartIcon key={i} level={f} />;
    if (kind === "food") return <FoodIcon key={i} level={f} />;
    return <ShieldIcon key={i} level={f} />;
  });
  return <div className={"sc-icon-row" + (pulse ? " pulse" : "") + (right ? " right" : "")}>{icons}</div>;
}

function Hotbar({ game }: { game: GameApi }) {
  const hud = game.hud;
  const swipeAt = useRef(-1);
  const swipeFrom = useRef(-1);
  const pickSlot = (bar: HTMLDivElement, x: number) => {
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return -1;
    const i = Math.min(8, Math.max(0, Math.floor(((x - rect.left) / rect.width) * 9)));
    if (i === swipeAt.current) return i;
    swipeAt.current = i;
    game.setSlot(i);
    return i;
  };
  const held = hud.hotbar[hud.slot];
  return (
    <div className="sc-hotbar-wrap">
      {held && held.id > 0 && (
        <div className="sc-held-name" key={hud.slot + ":" + held.id}>
          {def(held.id).name}
          {hud.heldEnch ? <em> ✦ {hud.heldEnch}</em> : null}
        </div>
      )}
      <div
        className="sc-hotbar"
        data-silent
        onPointerDown={(e) => {
          if (e.shiftKey || e.button !== 0) return;
          swipeAt.current = -1;
          e.currentTarget.setPointerCapture(e.pointerId);
          swipeFrom.current = pickSlot(e.currentTarget, e.clientX);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          pickSlot(e.currentTarget, e.clientX);
        }}
        onPointerUp={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const from = swipeFrom.current;
          const to = swipeAt.current;
          if (from >= 0 && to >= 0 && from !== to && hud.hotbar[from]?.id > 0) game.swapSlots(from, to);
          swipeFrom.current = -1;
        }}
      >
        {hud.hotbar.map((item, i) => (
          <button
            key={i}
            className={i === hud.slot ? "sc-slot on" : "sc-slot"}
            title={item.id > 0 ? def(item.id).name : ""}
            aria-label={item.id > 0 ? `Slot ${i + 1}: ${def(item.id).name}` : `Slot ${i + 1}: empty`}
            onClick={(e) => (e.shiftKey && item.id > 0 ? game.shiftStack(item.id) : game.setSlot(i))}
            onContextMenu={(e) => {
              if (item.id <= 0) return;
              e.preventDefault();
              game.shiftStack(item.id);
            }}
          >
            <small>{i + 1}</small>
            {item.id > 0 && <ItemIcon id={item.id} />}
            {item.id > 0 && item.count > 1 && <em>{item.count}</em>}
            {item.id > 0 && item.count === 0 && <em className="zero">0</em>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Touch controls
// ─────────────────────────────────────────────────────────────────────────────

/** Build-mode rotation stick (Philippe, 2026-10-30): the second
 *  joystick — left stick moves the build camera, THIS one pivots the
 *  held part. Horizontal = yaw (A/D), vertical = pitch (W/S), stepped
 *  through the same rotatePart path as the keys and the letter row;
 *  holding a direction keeps stepping. */
function RotStick({ game, buzz }: { game: GameApi; buzz: (ms: number) => void }) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const dirRef = useRef<{ axis: number; dir: number } | null>(null);
  const lastRef = useRef(0);
  const [knob, setKnob] = useState<{ kx: number; ky: number }>({ kx: 0, ky: 0 });
  const R = 34;
  const stepNow = () => {
    const d = dirRef.current;
    if (!d) return;
    buzz(5);
    game.rotatePart(d.axis, d.dir);
    lastRef.current = Date.now();
  };
  useEffect(() => {
    const t = setInterval(() => {
      if (dirRef.current && Date.now() - lastRef.current >= 175) stepNow();
    }, 60);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = (dx: number, dy: number) => {
    const m = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, R / m);
    setKnob({ kx: dx * k, ky: dy * k });
    const nx = dx / R;
    const ny = dy / R;
    let next: { axis: number; dir: number } | null = null;
    if (Math.max(Math.abs(nx), Math.abs(ny)) > 0.55) {
      if (Math.abs(nx) >= Math.abs(ny)) next = { axis: 1, dir: nx > 0 ? -1 : 1 };
      else next = { axis: 0, dir: ny > 0 ? 1 : -1 };
    }
    const prev = dirRef.current;
    dirRef.current = next;
    if (next && (!prev || prev.axis !== next.axis || prev.dir !== next.dir)) stepNow();
  };
  const release = () => {
    origin.current = null;
    dirRef.current = null;
    setKnob({ kx: 0, ky: 0 });
  };
  return (
    <div
      className="sc-rotstick-zone"
      role="application"
      aria-label="Rotation stick — pivot the held part"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        origin.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        update(0, 0);
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || o.id !== e.pointerId) return;
        update(e.clientX - o.x, e.clientY - o.y);
      }}
      onPointerUp={(e) => origin.current?.id === e.pointerId && release()}
      onPointerCancel={release}
    >
      <div className="sc-stick rotstick">
        <div className="sc-stick-knob small" style={{ transform: `translate(${knob.kx}px, ${knob.ky}px)` }} />
      </div>
      <span className="sc-rotstick-label">Pivot</span>
    </div>
  );
}

function TouchControls({ game }: { game: GameApi }) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const [stick, setStick] = useState<{ bx: number; by: number; kx: number; ky: number } | null>(null);
  const R = 52;
  const buzz = (ms: number) => {
    if (game.settings.haptics && navigator.vibrate) navigator.vibrate(ms);
  };
  const release = () => {
    origin.current = null;
    setStick(null);
    game.touch.moveX = 0;
    game.touch.moveY = 0;
  };
  const allUp = () => {
    game.touch.mine = false;
    game.touch.place = false;
    game.touch.jump = false;
    game.touch.spin = false;
    game.touch.sneak = false;
    game.touch.flyUp = false;
    game.touch.flyDown = false;
  };
  const hud = game.hud;
  const heldId = hud.hotbar[hud.slot]?.id ?? -1;
  const techHeld = TEKS_IDS.has(heldId);
  return (
    <div className="sc-touch" data-silent>
      <div
        className="sc-stick-zone"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const rect = e.currentTarget.getBoundingClientRect();
          origin.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          setStick({ bx: e.clientX - rect.left, by: e.clientY - rect.top, kx: 0, ky: 0 });
        }}
        onPointerMove={(e) => {
          const o = origin.current;
          if (!o || o.id !== e.pointerId) return;
          const dx = e.clientX - o.x;
          const dy = e.clientY - o.y;
          const m = Math.hypot(dx, dy) || 1;
          const k = Math.min(1, R / m);
          const nx = (dx * k) / R;
          const ny = (dy * k) / R;
          // Small dead zone, then full range.
          const mag = Math.hypot(nx, ny);
          const live = mag < 0.12 ? 0 : (mag - 0.12) / 0.88 / (mag || 1);
          game.touch.moveX = nx * live;
          game.touch.moveY = -ny * live;
          setStick((st) => (st ? { ...st, kx: dx * k, ky: dy * k } : st));
        }}
        onPointerUp={(e) => origin.current?.id === e.pointerId && release()}
        onPointerCancel={release}
      >
        {stick ? (
          <div className="sc-stick" style={{ left: stick.bx, top: stick.by }}>
            <div className="sc-stick-knob" style={{ transform: `translate(${stick.kx}px, ${stick.ky}px)` }} />
          </div>
        ) : (
          <div className="sc-stick idle">
            <div className="sc-stick-knob" />
          </div>
        )}
      </div>
      <button
        className="sc-touch-pause"
        aria-label="Pause"
        onClick={() => {
          allUp();
          game.pauseGame();
        }}
      >
        <PauseIcon size={20} />
      </button>
      <button
        className="sc-touch-bag"
        aria-label="Inventory"
        onClick={() => {
          allUp();
          game.toggleInventory();
        }}
      >
        <BagIcon size={22} />
      </button>
      <button
        className={"sc-touch-build" + (hud.buildMode ? " on" : "")}
        aria-label="Build mode"
        onClick={() => {
          allUp();
          buzz(10);
          game.toggleBuildMode();
        }}
      >
        ▦
      </button>
      {(hud.techAim || hud.driving) && (
        <button
          className="sc-touch-channel"
          aria-label={hud.driving ? "Cycle the vehicle's channel" : "Use or cycle channel on the aimed part"}
          onClick={() => {
            buzz(10);
            if (hud.driving) game.cycleChannel();
            else game.techUse();
          }}
        >
          CH
        </button>
      )}
      {(hud.driving || hud.techAimHub) && (
        <button
          className={"sc-touch-enter" + (hud.driving ? " on" : "")}
          aria-label={hud.driving ? "Park and exit the vehicle" : "Enter the vehicle"}
          onClick={() => {
            game.touch.moveX = 0;
            game.touch.moveY = 0;
            buzz(10);
            game.enterExitVehicle();
          }}
        >
          {hud.driving ? "Park" : "Drive"}
        </button>
      )}
      {hud.buildMode && (
        <>
          <div className="sc-touch-fly">
            <HoldButton className="flyup" label="Fly up" onHold={(v) => (game.touch.flyUp = v)} buzz={buzz}>
              ▲
            </HoldButton>
            <HoldButton className="flydown" label="Fly down" onHold={(v) => (game.touch.flyDown = v)} buzz={buzz}>
              ▼
            </HoldButton>
          </div>
          {techHeld && <RotStick game={game} buzz={buzz} />}
          {techHeld && (
            <div className="sc-touch-rot">
              {(
                [
                  [1, 1, "A", "Rotate part — same as the A key (yaw)"],
                  [1, -1, "D", "Rotate part — same as the D key (yaw)"],
                  [0, -1, "W", "Rotate part — same as the W key (pitch)"],
                  [0, 1, "S", "Rotate part — same as the S key (pitch)"],
                  [2, 1, "Q", "Rotate part — same as the Q key (roll)"],
                  [2, -1, "E", "Rotate part — same as the E key (roll)"],
                ] as [number, number, string, string][]
              ).map(([axis, dir, label, aria]) => (
                <button
                  key={label}
                  className="sc-rot-btn"
                  aria-label={aria}
                  onClick={() => {
                    buzz(6);
                    game.rotatePart(axis, dir);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {hud.driving ? (
        <div className="sc-touch-actions">
          <HoldButton className="gas" label="Throttle" onHold={(v) => (game.touch.moveY = v ? 1 : 0)} buzz={buzz}>
            ▲
          </HoldButton>
          <HoldButton className="brake" label="Brake or reverse" onHold={(v) => (game.touch.moveY = v ? -1 : 0)} buzz={buzz}>
            ▼
          </HoldButton>
          <HoldButton className="steerl" label="Steer left" onHold={(v) => (game.touch.moveX = v ? -1 : 0)} buzz={buzz}>
            ◀
          </HoldButton>
          <HoldButton className="steerr" label="Steer right" onHold={(v) => (game.touch.moveX = v ? 1 : 0)} buzz={buzz}>
            ▶
          </HoldButton>
          {hud.bucketCap > 0 && (
            <button
              className="sc-touch-dump"
              aria-label="Dump the dig bucket"
              onClick={() => {
                buzz(10);
                game.dumpBucket();
              }}
            >
              ⛏ {hud.bucketLoad}/{hud.bucketCap}
            </button>
          )}
        </div>
      ) : (
      <div className="sc-touch-actions">
        <HoldButton className="mine" label="Mine or attack" onHold={(v) => (game.touch.mine = v)} buzz={buzz}>
          <PickIcon size={30} />
        </HoldButton>
        <HoldButton className="place" label="Place or use" onHold={(v) => (game.touch.place = v)} buzz={buzz}>
          <HandIcon size={26} />
        </HoldButton>
        <HoldButton className="jump" label="Jump" onHold={(v) => (game.touch.jump = v)} buzz={buzz}>
          <JumpIcon size={28} />
        </HoldButton>
        <HoldButton className="sneak" label="Sneak — park vehicle, bind channel" onHold={(v) => (game.touch.sneak = v)} buzz={buzz}>
          ▼
        </HoldButton>
        <HoldButton
          className="spin"
          label="Turn part — cycle the placement variant"
          onHold={(v) => {
            if (v) game.touch.spin = true;
          }}
          buzz={buzz}
        >
          <GearIcon size={26} />
        </HoldButton>
      </div>
      )}
    </div>
  );
}

function HoldButton({ label, onHold, children, className, buzz }: { label: string; onHold: (down: boolean) => void; children: ReactNode; className: string; buzz: (ms: number) => void }) {
  const [down, setDown] = useState(false);
  const set = (v: boolean) => {
    setDown(v);
    onHold(v);
  };
  // unmounted while held (a menu opened under the finger): release the hold
  const holdRef = useRef(onHold);
  holdRef.current = onHold;
  useEffect(() => () => holdRef.current(false), []);
  return (
    <button
      className={"sc-hold " + className + (down ? " down" : "")}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true);
        buzz(10);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory hub (bag, crafting, ranks, quests, skills) and stations
// ─────────────────────────────────────────────────────────────────────────────

type Page = "bin" | "craft" | "ranks" | "quests" | "skills";

function Inventory({ game }: { game: GameApi }) {
  const hud = game.hud;
  const station = hud.panel === "furnace" || hud.panel === "chest" || hud.panel === "enchant" || hud.panel === "anvil" || hud.panel === "brew" || hud.panel === "trade" || hud.panel === "beacon";
  const [page, setPage] = useState<Page>(hud.panel === "bench" ? "craft" : "bin");
  if (station) return <StationScreen game={game} />;
  const tabs: { id: Page; icon: ReactNode; label: string }[] = [
    { id: "bin", icon: <BagIcon size={20} />, label: "Bag" },
    { id: "craft", icon: <HammerIcon size={20} />, label: "Craft" },
    { id: "skills", icon: <StarIcon size={20} />, label: "Skills" },
    { id: "quests", icon: <ScrollIcon size={20} />, label: "Quests" },
    { id: "ranks", icon: <MedalIcon size={20} />, label: "Ranks" },
  ];
  const titles: Record<Page, string> = {
    bin: hud.panel === "bench" ? "Workbench" : "Inventory",
    craft: "Crafting",
    ranks: hud.rank,
    quests: "Quest board",
    skills: "Skill tree",
  };
  return (
    <div className="sc-menu-layer sc-inv-layer">
      <section className="sc-panel sc-inv" aria-label={titles[page]}>
        <nav className="sc-inv-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={page === t.id} className={page === t.id ? "on" : ""} onClick={() => setPage(t.id)}>
              {t.icon}
              <span>{t.label}</span>
              {t.id === "skills" && hud.skillPoints > 0 && !hud.creative && <i className="sc-dot-badge">{hud.skillPoints}</i>}
              {t.id === "quests" && hud.questAlert && <i className="sc-dot-badge">!</i>}
            </button>
          ))}
        </nav>
        <div className="sc-inv-main">
          <PanelHead
            eyebrow={page === "skills" ? `${hud.skillPoints} point${hud.skillPoints === 1 ? "" : "s"} to spend` : page === "ranks" ? `Level ${hud.level}` : hud.creative ? "Creative" : "Survival"}
            title={titles[page]}
            right={
              <button className="sc-icon-btn" aria-label="Close" onClick={() => game.toggleInventory()}>
                <CloseIcon size={22} />
              </button>
            }
          />
          <div className="sc-scroll">
            {page === "bin" && <BinPage game={game} />}
            {page === "craft" && <CraftPage game={game} />}
            {page === "ranks" && <Ranks hud={hud} game={game} />}
            {page === "quests" && <QuestList hud={hud} onClaim={(id) => game.claim(id)} />}
            {page === "skills" && <SkillTree hud={hud} onUnlock={(id) => game.unlock(id)} />}
          </div>
          {(page === "bin" || page === "craft") && <InvHotbar game={game} />}
        </div>
      </section>
    </div>
  );
}

// The hotbar, always visible inside the inventory (like Minecraft): you see
// which slot an item goes into. Tap a slot to make it the target; tap the
// target slot again to empty it (creative). Items tapped in the grid land in
// the target slot, which then moves to the next empty one.
function InvHotbar({ game }: { game: GameApi }) {
  const hud = game.hud;
  return (
    <div className="sc-inv-hotbar" role="group" aria-label="Hotbar">
      {hud.hotbar.map((item, i) => (
        <button
          key={i}
          className={"sc-cell" + (i === hud.slot ? " target" : "")}
          aria-label={item.id > 0 ? `Hotbar ${i + 1}: ${def(item.id).name}` : `Hotbar ${i + 1}: empty`}
          onClick={() => {
            if (i === hud.slot && hud.creative && item.id > 0) game.clearSlot(i);
            else game.setSlot(i);
          }}
        >
          <span className="sc-cell-hb">{i + 1}</span>
          {i === hud.slot && item.id > 0 && <span className="sc-name-pill">{hud.named[item.id] ?? def(item.id).name}</span>}
          {item.id > 0 && <ItemIcon id={item.id} />}
          {item.id > 0 && !hud.creative && item.count > 1 && <em>{item.count > 999 ? "999+" : item.count}</em>}
        </button>
      ))}
    </div>
  );
}

type BinCategory = "all" | "bricks" | "teks" | "matter" | "gear" | "food" | "nature";

const TEKS_IDS = new Set<number>(TEKS);

// P8: inventory categories follow the PLASTIC SYSTEM, not the old
// Minecraft inheritance. Matter = the feedstock economy (what the
// Foundry eats and casts: pellets, ingots, ores, charges, colour
// bricks and their tempered forms). Gear = what you wear and wield.
// Nature = the living world's yield (drops, seeds, organics) and
// anything else unclassified. Order matters: first match wins.
const MATTER_IDS = new Set<number>([
  ID.Pellets, ID.PlasticIngot, ID.TemperedIngot, ID.Fuel,
  ID.Coal, ID.Gold, ID.Diamond, ID.Emerald,
  ID.IronOre, ID.TinOre, ID.CopperOre, ID.AmberOre, ID.ChromeOre,
  ID.RawIron, ID.Ingot, ID.Tin, ID.Copper, ID.Bronze, ID.Chrome, ID.Amber, ID.Sapphire, ID.Prism, ID.Resin,
  ...COLORS,
]);

function itemBinCategory(id: number): BinCategory {
  if (TEKS_IDS.has(id)) return "teks";
  const d = def(id);
  if (d.tool || d.armor > 0 || d.armorSlot || d.maxUse > 0 || id === ID.Shield || id === ID.Elytra || id === ID.Bow || id === ID.Crossbow || id === ID.Trident || id === ID.Arrow || id === ID.Totem) {
    return "gear";
  }
  if (d.food > 0 || id === ID.Bottle || id === ID.PotionHeal || id === ID.PotionSpeed || id === ID.PotionStr || id === ID.PotionRegen || id === ID.PotionFire || id === ID.PotionLeap || id === ID.PotionGill || id === ID.PotionVeil || id === ID.PotionVenom || id === ID.PotionTar || id === ID.SplashVenom || id === ID.SplashTar || id === ID.Focus || id === ID.Milk || id === ID.BaseBrew) {
    return "food";
  }
  if (MATTER_IDS.has(id) || (id >= 410 && id <= 418)) return "matter"; // tempered colour bricks
  if (d.placeable) return "bricks";
  return "nature";
}

function BinGrid({ game, filter = "", cat = "all", onPick }: { game: GameApi; filter?: string; cat?: BinCategory; onPick?: (id: number) => void }) {
  const hud = game.hud;
  const q = filter.trim().toLowerCase();
  const ids = CATALOG.filter((id) => {
    if (!hud.creative && (hud.inv[id] ?? 0) <= 0) return false;
    if (cat !== "all" && itemBinCategory(id) !== cat) return false;
    if (q && !def(id).name.toLowerCase().includes(q)) return false;
    return true;
  });
  if (ids.length === 0) return <p className="sc-empty">{q || cat !== "all" ? "No matching bricks or items." : "Your bag is empty. Go punch a tree."}</p>;
  return (
    <div className="sc-grid">
      {ids.map((id) => {
        const d = def(id);
        const count = hud.creative ? -1 : (hud.inv[id] ?? 0);
        const hbIndex = hud.hotbar.findIndex((h) => h.id === id);
        const durPct = d.maxUse > 0 && count > 0 ? Math.max(0, Math.min(100, Math.round((count / d.maxUse) * 100))) : -1;
        return (
          <button
            key={id}
            className={"sc-cell" + (hud.cursor === id ? " held" : "") + (hbIndex >= 0 ? " in-hb" : "")}
            title={`${d.name}${d.maxUse > 0 && count > 0 ? ` (${count}/${d.maxUse} durability)` : count > 0 ? ` (×${count})` : ""}`}
            aria-label={d.name + (count >= 0 ? `, ${count}` : "")}
            onClick={(e) => {
              if (onPick) {
                onPick(id); // stations: the tap moves the stack (no hotbar change)
                return;
              }
              if (e.shiftKey) {
                game.shiftStack(id);
                return;
              }
              const now = Date.now();
              const btn = e.currentTarget as HTMLButtonElement;
              if (now - Number(btn.dataset.tap ?? "0") < 320) {
                game.shiftStack(id);
                btn.dataset.tap = "0";
                return;
              }
              btn.dataset.tap = String(now);
              game.hold(id);
              game.assign(id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              game.shiftStack(id);
            }}
          >
            {hbIndex >= 0 && <span className="sc-cell-hb">{hbIndex + 1}</span>}
            {hud.cursor === id && <span className="sc-name-pill">{hud.named[id] ?? d.name}</span>}
            <ItemIcon id={id} />
            {d.maxUse > 0 && durPct >= 0 ? (
              <span className="sc-dur-bar">
                <i style={{ width: `${durPct}%`, background: durPct > 55 ? "#5bd16a" : durPct > 25 ? "#f5c518" : "#e23b2f" }} />
              </span>
            ) : (
              count > 1 && <em>{count > 999 ? "999+" : count}</em>
            )}
          </button>
        );
      })}
    </div>
  );
}

function BinPage({ game }: { game: GameApi }) {
  const hud = game.hud;
  const [filter, setFilter] = useState("");
  const [cat, setCat] = useState<BinCategory>("all");
  const armorPts = useMemo(() => {
    let sum = 0;
    for (const id of hud.armor) if (id > 0) sum += def(id).armor;
    return Math.max(0, Math.min(20, Math.round(sum / 0.024)));
  }, [hud.armor]);
  return (
    <div className="sc-bin">
      <div className="sc-bin-side">
        <div className="sc-bin-head-row">
          <p className="sc-label">Equipment</p>
          <span className="sc-armor-badge" title="Armor Defense Rating">
            <ShieldIcon size={13} /> {armorPts}/20
          </span>
        </div>
        <div className="sc-armor">
          {hud.armor.map((id, i) => (
            <button key={i} className={"sc-cell" + (id > 0 ? " equipped" : "")} onClick={() => game.armorTap(i)} aria-label={["Helmet", "Chestplate", "Leggings", "Boots"][i]} title={id > 0 ? `${def(id).name} (click to unequip)` : ["Head", "Body", "Legs", "Feet"][i]}>
              {id > 0 ? <ItemIcon id={id} /> : <small>{["Head", "Body", "Legs", "Feet"][i]}</small>}
            </button>
          ))}
          <div className="sc-cell offhand" role="img" aria-label="Off hand" title="Off hand (press F in-game to swap)">
            {hud.offhand > 0 ? <ItemIcon id={hud.offhand} /> : <small>Off-hand (F)</small>}
          </div>
        </div>
        <p className="sc-hint">Tap armor to unequip · press F in-game to swap off-hand.</p>
        <p className="sc-label">STUDS Color Press</p>
        <div className="sc-colors">
          {COLORS.map((id) => (
            <button key={id} style={{ background: def(id).color }} title={`Mold ${def(id).name}`} aria-label={"Press " + def(id).name} onClick={(e) => (e.shiftKey ? game.shiftStack(id) : game.press(id))} />
          ))}
        </div>
        <p className="sc-hint">Molds 1 spare brick into any classic STUDS color.</p>
      </div>
      <div className="sc-bin-main">
        <div className="sc-search">
          <input type="search" placeholder="Search bricks, teks, tools, food…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search items" />
          <span className="sc-held">
            Held: <strong>{hud.cursor ? def(hud.cursor).name : "None"}</strong>
          </span>
        </div>
        {hud.cursor > 0 && (
          <div className="sc-item-bubble" key={hud.cursor}>
            <ItemIcon id={hud.cursor} /> {hud.named[hud.cursor] ?? def(hud.cursor).name}
          </div>
        )}
        <div className="sc-chips sc-bin-chips">
          {(
            [
              ["all", "All"],
              ["bricks", "Bricks"],
              ["teks", "Teks"],
              ["matter", "Matter"],
              ["gear", "Gear"],
              ["food", "Food & Brews"],
              ["nature", "Nature"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={cat === id ? "sc-chip-btn on" : "sc-chip-btn"} onClick={() => setCat(id)}>
              {label}
            </button>
          ))}
        </div>
        <BinGrid game={game} filter={filter} cat={cat} />
        <p className="sc-hint">Tap an item: it goes into hotbar slot {hud.slot + 1} (highlighted below) · tap another slot to choose where.</p>
      </div>
    </div>
  );
}

function CraftPage({ game }: { game: GameApi }) {
  const hud = game.hud;
  const bench = hud.panel === "bench";
  const [book, setBook] = useState<"all" | "build" | "tools" | "magic" | "gear" | "food" | "teks">("all");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState("");
  const [onlyCan, setOnlyCan] = useState(false);
  const [showGrid, setShowGrid] = useState(bench);

  const maxBatches = (entry: Recipe) => {
    if (entry.special === "hammer" && hud.hammer) return 0;
    if (entry.lvl && !hud.creative && hud.level < entry.lvl) return 0;
    if (entry.skill && !hud.creative && !hud.skills.includes(entry.skill)) return 0;
    if (hud.creative) return 64;
    let m = 64;
    for (const [id, n] of entry.need) {
      if (n <= 0) continue;
      const have = hud.inv[id] ?? 0;
      m = Math.min(m, Math.floor(have / n));
    }
    return Math.max(0, m);
  };

  const afford = (entry: Recipe, times = 1) => maxBatches(entry) >= times;
  const q = search.trim().toLowerCase();

  const catCounts: Record<string, number> = { all: 0, build: 0, tools: 0, gear: 0, food: 0, magic: 0 };
  for (const r of RECIPES) {
    if (onlyCan && !afford(r)) continue;
    if (q && !r.name.toLowerCase().includes(q) && !r.detail.toLowerCase().includes(q)) continue;
    catCounts.all++;
    if (r.cat) catCounts[r.cat] = (catCounts[r.cat] ?? 0) + 1;
  }

  const list = RECIPES.filter((r) => {
    if (book !== "all" && r.cat !== book) return false;
    if (onlyCan && !afford(r)) return false;
    if (q && !r.name.toLowerCase().includes(q) && !r.detail.toLowerCase().includes(q)) return false;
    return true;
  });

  const recipe = list.find((e) => e.id === sel) ?? list[0];
  const recipeMax = recipe ? maxBatches(recipe) : 0;
  const isSingleOut = recipe ? Boolean(recipe.special || def(recipe.out).maxUse || def(recipe.out).armorSlot) : false;

  // Build a 3x3 padded preview matrix for the selected recipe
  const preview3x3 = useMemo(() => {
    const cells = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (!recipe) return cells;
    if (recipe.shape && recipe.w && recipe.h) {
      const ox = recipe.w === 1 ? 1 : 0;
      const oy = recipe.h === 1 ? 1 : 0;
      for (let y = 0; y < recipe.h && y + oy < 3; y++) {
        for (let x = 0; x < recipe.w && x + ox < 3; x++) {
          cells[(x + ox) + (y + oy) * 3] = recipe.shape[x + y * recipe.w] || 0;
        }
      }
      return cells;
    }
    // Fallback arrangement from `need` list
    let idx = 0;
    for (const [id, count] of recipe.need) {
      for (let k = 0; k < Math.min(count, 9 - idx); k++) {
        cells[idx++] = id;
      }
    }
    return cells;
  }, [recipe]);

  return (
    <div className="sc-craft">
      <div className="sc-craft-top">
        <div className="sc-search sc-craft-search">
          <input
            type="search"
            placeholder="Search recipes (pickaxe, torch, teks parts, armor, food…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search recipes"
          />
          <button
            type="button"
            className={showGrid ? "sc-chip-btn on" : "sc-chip-btn"}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle manual 3×3 / 2×2 crafting table"
          >
            <HammerIcon size={14} /> {bench ? "3×3 Bench Grid" : "2×2 Pocket Grid"}
          </button>
        </div>
        <div className="sc-chips">
          {(
            [
              ["all", "All"],
              ["build", "Build"],
              ["tools", "Tools"],
              ["gear", "Armor & Gear"],
              ["food", "Food"],
              ["magic", "Arcane"],
              ["teks", "Teks"],
            ] as const
          ).map(([cat, label]) => (
            <button key={cat} className={book === cat ? "sc-chip-btn on" : "sc-chip-btn"} onClick={() => setBook(cat)}>
              <span>{label}</span>
              <small className="sc-chip-count">{catCounts[cat] ?? 0}</small>
            </button>
          ))}
          <button className={onlyCan ? "sc-chip-btn on craftable-toggle" : "sc-chip-btn craftable-toggle"} onClick={() => setOnlyCan(!onlyCan)}>
            <CheckIcon size={14} /> Craftable only
          </button>
        </div>
      </div>

      <div className="sc-craft-body">
        <div className="sc-recipes">
          {list.map((entry) => {
            const batches = maxBatches(entry);
            const can = batches > 0;
            return (
              <button
                key={entry.id + "-" + entry.name}
                className={"sc-recipe" + (recipe && entry.id === recipe.id ? " on" : "") + (can ? "" : " dim")}
                onClick={() => setSel(entry.id)}
                onDoubleClick={() => can && game.craft(entry.id, 1)}
              >
                <span className="sc-recipe-ic">
                  <ItemIcon id={entry.out > 0 ? entry.out : ID.AxeW} />
                  {entry.n > 1 && <em className="sc-recipe-qty">×{entry.n}</em>}
                </span>
                <span className="sc-recipe-tx">
                  <strong>{entry.name}</strong>
                  <small>{entry.detail}</small>
                </span>
                {can ? (
                  <span className="sc-recipe-ready" title={`Can craft ${batches}×`}>
                    <i className="sc-ok-dot" aria-label="Craftable" />
                    {!hud.creative && batches > 1 && <small>×{batches > 99 ? "99+" : batches}</small>}
                  </span>
                ) : entry.lvl && hud.level < entry.lvl ? (
                  <span className="sc-recipe-lock">Lv {entry.lvl}</span>
                ) : null}
              </button>
            );
          })}
          {list.length === 0 && <p className="sc-empty">No recipes match this filter.</p>}
        </div>

        {recipe && (
          <div className="sc-recipe-detail">
            <div className="sc-rd-head">
              <span className="sc-rd-ic">
                <ItemIcon id={recipe.out > 0 ? recipe.out : ID.AxeW} />
                {recipe.n > 1 && <em>×{recipe.n}</em>}
              </span>
              <div className="sc-rd-title">
                <div className="sc-rd-badges">
                  {recipe.cat && <span className="sc-rd-tag">{recipe.cat}</span>}
                  {recipe.lvl ? <span className={"sc-rd-tag" + (hud.level < recipe.lvl && !hud.creative ? " locked" : "")}>Rank {recipe.lvl}</span> : null}
                  {recipe.skill ? <span className="sc-rd-tag">{recipe.skill} skill</span> : null}
                </div>
                <strong>{recipe.name}</strong>
                <small>
                  Output: {recipe.n} {recipe.out > 0 ? def(recipe.out).name : "Brick Hammer"}
                  {!hud.creative && recipe.out > 0 ? ` · In bag: ${hud.inv[recipe.out] ?? 0}` : ""}
                </small>
              </div>
            </div>

            <div className="sc-rd-blueprint">
              <div className="sc-rd-grid-wrap">
                <span className="sc-rd-sub">3×3 Assembly Pattern</span>
                <div className="sc-shape sc-shape-3x3">
                  {preview3x3.map((id, i) => {
                    const have = id > 0 ? (hud.creative || (hud.inv[id] ?? 0) > 0) : false;
                    return (
                      <span
                        key={i}
                        className={"sc-shape-cell" + (id > 0 ? (have ? " filled" : " missing") : " empty")}
                        title={id > 0 ? def(id).name : "Empty slot"}
                      >
                        {id > 0 && <ItemIcon id={id} />}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="sc-rd-needs-wrap">
                <span className="sc-rd-sub">Required Bricks</span>
                <div className="sc-needs">
                  {recipe.need.map(([id, n]) => {
                    const have = hud.creative ? n : (hud.inv[id] ?? 0);
                    return (
                      <span key={id} className={have >= n ? "sc-need ok" : "sc-need miss"}>
                        <span className="sc-need-ic">
                          <ItemIcon id={id} />
                        </span>
                        <span>{def(id).name}</span>
                        <b>
                          {hud.creative ? "∞" : have}/{n}
                        </b>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sc-craft-actions">
              <button className="sc-btn sc-btn-primary" disabled={recipeMax < 1} onClick={() => game.craft(recipe.id, 1)}>
                <HammerIcon size={18} /> Craft ×{recipe.n}
              </button>
              {!isSingleOut && (
                <>
                  <button
                    className="sc-btn sc-btn-sm"
                    disabled={recipeMax < 4}
                    onClick={() => game.craft(recipe.id, 4)}
                    title={`Craft 4 batches (${recipe.n * 4} total)`}
                  >
                    ×{recipe.n * 4}
                  </button>
                  <button
                    className="sc-btn sc-btn-gold sc-btn-sm"
                    disabled={recipeMax < 2}
                    onClick={() => game.craft(recipe.id, Math.min(64, recipeMax))}
                    title={`Craft maximum possible (${Math.min(64, recipeMax)} batches)`}
                  >
                    Max ({Math.min(64, recipeMax) * recipe.n})
                  </button>
                </>
              )}
              {recipe.shape && (
                <button
                  type="button"
                  className="sc-btn sc-btn-ghost sc-btn-sm"
                  onClick={() => {
                    setShowGrid(true);
                    game.fillGrid(recipe.id);
                  }}
                  title="Place ingredients onto the manual crafting grid"
                >
                  Place on Grid
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showGrid && (
        <div className="sc-manual-card">
          <div className="sc-manual-head">
            <div>
              <strong>{bench ? "3×3 Master Workbench Grid" : "2×2 Pocket Assembly Grid"}</strong>
              <small>
                {bench ? "All 9 crafting slots unlocked." : "2×2 pocket grid active — use a Workbench for 3×3 patterns."} Hold a brick in Bag or click "Place on Grid".
              </small>
            </div>
            {hud.grid.some((x) => x > 0) && (
              <button type="button" className="sc-btn sc-btn-ghost sc-btn-sm" onClick={() => game.clearGrid()}>
                Clear Grid
              </button>
            )}
          </div>
          <div className="sc-manual">
            <div className="sc-craft-grid">
              {hud.grid.map((id, i) => {
                const lockedSlot = !bench && (i % 3 === 2 || i >= 6);
                return (
                  <button
                    key={i}
                    className={"sc-cell" + (lockedSlot ? " locked-cell" : "")}
                    onClick={() => game.gridTap(i)}
                    disabled={lockedSlot}
                    title={id > 0 ? `${def(id).name} (click to return to bag)` : lockedSlot ? "Requires 3×3 Workbench" : "Click to place held brick"}
                  >
                    {id > 0 && <ItemIcon id={id} />}
                  </button>
                );
              })}
            </div>
            <span className="sc-arrow">→</span>
            <button className={"sc-cell big out" + (hud.craftOut ? " ready" : "")} onClick={() => game.craftTake()} title={hud.craftOut ? `Take ${def(hud.craftOut.id).name} ×${hud.craftOut.n}` : "Pattern output"}>
              {hud.craftOut ? <ItemIcon id={hud.craftOut.id} /> : <small>Result</small>}
              {hud.craftOut && hud.craftOut.n > 1 ? <em>{hud.craftOut.n}</em> : null}
            </button>
            {hud.craftOut && (
              <div className="sc-manual-out-label">
                <strong>{def(hud.craftOut.id).name}</strong>
                <small>Click output slot to craft ×{hud.craftOut.n}</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StationScreen({ game }: { game: GameApi }) {
  const hud = game.hud;
  const titles: Record<string, string> = {
    furnace: "Kiln",
    chest: "Chest",
    enchant: "Rune table",
    anvil: "Anvil",
    brew: "Brew stand",
    trade: hud.trader || "Trader",
    beacon: "Beacon",
  };
  const brews: { id: string; label: string; detail: string; primary?: boolean }[] = [
    { id: "base", label: "Base brew", detail: "Bottle + wart — every chain brew starts here", primary: true },
    { id: "heal", label: "Mend brew", detail: "Bottle + apple" },
    { id: "speed", label: "Dash brew", detail: "Bottle + wart" },
    { id: "might", label: "Might brew", detail: "Bottle + ember rod" },
    { id: "focus", label: "Focus brew", detail: "Bottle + amber · rank 6" },
    { id: "regen", label: "Regen brew", detail: "Base + fang · heal over time" },
    { id: "fireward", label: "Ward brew", detail: "Base + cinder · fire can't touch you" },
    { id: "leap", label: "Leap brew", detail: "Base + feather · jump higher" },
    { id: "gill", label: "Gill brew", detail: "Base + fish · breathe underwater" },
    { id: "veil", label: "Veil brew", detail: "Base + frost · mobs stop seeing you" },
    { id: "venom", label: "Venom brew", detail: "Base + red mushroom" },
    { id: "tar", label: "Tar brew", detail: "Base + slime · heavy feet" },
    { id: "splashvenom", label: "Venom splash", detail: "Venom brew + powder · throw it" },
    { id: "splashtar", label: "Tar splash", detail: "Tar brew + powder · throw it" },
  ];
  return (
    <div className="sc-menu-layer sc-inv-layer">
      <section className="sc-panel sc-inv sc-station" aria-label={titles[hud.panel] ?? hud.panel}>
        <div className="sc-inv-main">
          <PanelHead
            eyebrow="Station"
            title={titles[hud.panel] ?? hud.panel}
            right={
              <button className="sc-icon-btn" aria-label="Close" onClick={() => game.toggleInventory()}>
                <CloseIcon size={22} />
              </button>
            }
          />
          <div className="sc-scroll">
            {hud.panel === "furnace" && (
              <>
                <div className="sc-kiln">
                  <figure>
                    <button className="sc-cell big" onClick={() => game.furnaceTap(0)}>
                      {hud.furnace.in ? <ItemIcon id={hud.furnace.in} /> : <small>Ore</small>}
                      {hud.furnace.inN > 0 && <em>{hud.furnace.inN}</em>}
                    </button>
                    <figcaption>Input</figcaption>
                  </figure>
                  <figure>
                    <button className="sc-cell big" onClick={() => game.furnaceTap(1)}>
                      {hud.furnace.fuel ? <ItemIcon id={hud.furnace.fuel} /> : <small>Fuel</small>}
                      {hud.furnace.fuelN > 0 && <em>{hud.furnace.fuelN}</em>}
                    </button>
                    <figcaption>Fuel</figcaption>
                  </figure>
                  <div className="sc-kiln-arrow">
                    <span style={{ width: `${Math.round(hud.furnace.cook * 100)}%` }} />
                  </div>
                  <figure>
                    <button className="sc-cell big out" onClick={() => game.furnaceTap(2)}>
                      {hud.furnace.out ? <ItemIcon id={hud.furnace.out} /> : <small>Out</small>}
                      {hud.furnace.outN > 0 && <em>{hud.furnace.outN}</em>}
                    </button>
                    <figcaption>Output</figcaption>
                  </figure>
                </div>
                <p className="sc-kiln-state">
                  {hud.furnace.burn > 0 ? (
                    <>🔥 Burning — {Math.ceil(hud.furnace.burn)}s of fuel left · cooking {Math.round(hud.furnace.cook * 100)}%</>
                  ) : hud.furnace.in ? (
                    hud.furnace.cook > 0 ? (
                      <>Out of fuel — the cook holds at {Math.round(hud.furnace.cook * 100)}%. Add fuel to finish it.</>
                    ) : (
                      <>Not lit — add fuel: wood (log 3s, planks 1.5s), coal 8s, or burn quality plastic (ingot 6s, tempered 10s).</>
                    )
                  ) : (
                    <>Everything melts to plastic except gold, diamonds and wood. Commons (dirt, stone) need 12–16 per pellet; rare drops melt 1:1 at high purity. Wood goes in Fuel.</>
                  )}
                </p>
                <div className="sc-molten" style={{ border: `1px solid ${hud.furnace.tierColor ?? "#888"}`, borderRadius: 8, padding: "6px 8px", margin: "6px 0" }}>
                  <p style={{ margin: 0, fontWeight: 700, color: hud.furnace.tierColor }}>
                    Molten pool · {hud.furnace.tier ?? "Raw"} · purity {hud.furnace.purity ?? 0}%
                  </p>
                  <div aria-label="Heat" style={{ height: 8, borderRadius: 4, background: "#222", overflow: "hidden", margin: "4px 0" }}>
                    <span style={{ display: "block", height: "100%", width: `${Math.round((hud.furnace.heat ?? 0) * 100)}%`, background: `linear-gradient(90deg, #7a2a10, ${hud.furnace.glow ?? "#ff8040"})`, boxShadow: `0 0 10px ${hud.furnace.glow ?? "#ff8040"}`, transition: "width .3s" }} />
                  </div>
                  <small>
                    Heat {Math.round((hud.furnace.heat ?? 0) * 100)}% — a cold kiln cooks at ¼ speed.
                    {hud.furnace.affix ? <> · <b>✨ {hud.furnace.affix} ({hud.furnace.charges} pours)</b></> : <> · Melt a rare drop (boss relic, prism, core) for a bonus batch.</>}
                    {hud.furnace.nextTier ? <> · Upgrade to reach {hud.furnace.nextTier}.</> : null}
                  </small>
                </div>
                <div className={`sc-upg-card lvl${hud.furnace.lvl}`}>
                  <p className="sc-upg-head">Foundry · Level {hud.furnace.lvl} — {hud.furnace.lvlName}</p>
                  <p className="sc-upg-stats">
                    Cook {hud.furnace.cookSecs}s{hud.furnace.fuelMul > 1 ? ` · fuel lasts ×${hud.furnace.fuelMul}` : ""}
                    {hud.furnace.upg && (
                      <>
                        {" → Level "}
                        {hud.furnace.lvl + 1}: cook {hud.furnace.upg.cookSecs}s{hud.furnace.upg.fuelMul > hud.furnace.fuelMul ? ` · fuel lasts ×${hud.furnace.upg.fuelMul}` : ""}
                      </>
                    )}
                  </p>
                  {hud.furnace.upg ? (
                    <MenuButton variant="primary" disabled={!hud.furnace.upg.ok} onClick={() => game.upgradeFurnace()} hint={hud.furnace.upg.ok ? "Pay the matter and upgrade this Foundry for good" : "You don't have all the matter yet"}>
                      Upgrade — {hud.furnace.upg.cost.map(([cid, n]) => `${n}× ${def(cid).name}`).join(" + ")}
                    </MenuButton>
                  ) : (
                    <p className="sc-muted">Max level — this Foundry runs at full song.</p>
                  )}
                </div>
                <p className="sc-hint">Plastic pellets smelt into ingots here — higher purity tiers (Fine/Superior/Masterwork) pour bonus ingots, rare melts charge an affix — and every pellet smelted also distils Fuel, dropped beside the kiln. Ingots cast bricks and Teks parts from the Crafting book. Tap an item below: ores and food go to Input, fuel to Fuel. Tap a kiln slot to take its stack back.</p>
                <BinGrid game={game} onPick={(id) => game.furnaceQuick(id)} />
              </>
            )}
            {hud.panel === "chest" && (
              <>
                <div className="sc-grid sc-chest">
                  {hud.chest.map((cell, i) => (
                    <button key={i} className="sc-cell" onClick={() => game.chestTap(i)} aria-label={cell.id > 0 ? def(cell.id).name : "Empty"}>
                      {cell.id > 0 && <ItemIcon id={cell.id} />}
                      {cell.n > 1 && <em>{cell.n}</em>}
                    </button>
                  ))}
                </div>
                <p className="sc-label">Your bag</p>
                <BinGrid game={game} onPick={(id) => game.chestStore(id)} />
                <p className="sc-hint">Tap a crate stack to take it all · tap a bag item to put its whole stack in the crate.</p>
              </>
            )}
            {hud.panel === "enchant" && (
              <div className="sc-station-body">
                <p className="sc-status">
                  ✦ Arcane Power: {hud.bookshelves ?? 0}/15 Bookshelves · Your XP: Lv.{hud.level}
                </p>
                <MenuButton
                  variant="primary"
                  icon={<StarIcon size={20} />}
                  onClick={() => game.enchantOffer(1)}
                  hint="Reveal 3 runes and choose 1 · Cost: 1 XP Level, paid when you pick (No bookshelves required) · A held Book binds instantly instead"
                >
                   Reveal Tier I Runes · 1 Level
                </MenuButton>
                <MenuButton
                  variant="primary"
                  icon={<StarIcon size={20} />}
                  onClick={() => game.enchantOffer(2)}
                  hint={`Reveal 3 runes and choose 1 · Cost: 2 XP Levels, paid when you pick · Stronger Rune II (${(hud.bookshelves ?? 0) >= 6 ? "Bookshelf bonus active!" : "Place 6+ Bookshelves nearby for full power"})`}
                >
                  ✦ Reveal Tier II Runes · 2 Levels
                </MenuButton>
                <MenuButton
                  variant="primary"
                  icon={<StarIcon size={20} />}
                  onClick={() => game.enchantOffer(3)}
                  hint={`Reveal 3 runes and choose 1 · Cost: 3 XP Levels, paid when you pick · Master Rune III–V + Bonus Rune (${(hud.bookshelves ?? 0) >= 12 ? "Max Bookshelf power active!" : "Place 12–15 Bookshelves within 2 blocks for max tier"})`}
                >
                  ✦✦ Reveal Tier III Runes · 3 Levels
                </MenuButton>
                {hud.enchOffers && (
                  <>
                    <p className="sc-status">✦ The table offers — pick your rune:</p>
                    {hud.enchOffers.offers.map((o, i) => (
                      <MenuButton
                        key={o.key}
                        variant="primary"
                        icon={<StarIcon size={20} />}
                        disabled={!hud.creative && hud.level < (hud.enchOffers?.tier ?? 0)}
                        onClick={() => game.enchantPick(i)}
                        hint={`${o.name} rises to level ${o.to} · Cost: ${hud.enchOffers?.tier ?? 0} XP Level${(hud.enchOffers?.tier ?? 0) > 1 ? "s" : ""}, paid now`}
                      >
                        ✦ {o.label}
                      </MenuButton>
                    ))}
                    <MenuButton variant="ghost" onClick={() => game.enchantCancel()} hint="Dismiss the offers — no cost">
                      Not now
                    </MenuButton>
                  </>
                )}
                {hud.heldEnch && <p className="sc-status">Held: ✦ {hud.heldEnch}</p>}
                <p className="sc-muted">
                  Surround the Enchanting Table with up to 15 STUDS Bookshelves (within 2 blocks) to unlock higher rune levels. Reveal a tier to see three runes, then choose the one you want — you pay only when you pick. Blades & Boss Weapons take Sharpness, Smite, Bane, Fire Aspect, Knockback, Looting. Tridents & Crossbows take Power/Sharpness & Unbreaking. Picks take Efficiency, Fortune or Silk Touch. Armor takes Protection & Thorns; Boots learn Feather Fall, Depth Strider or Frost Walker. Hold a plain Book to bind an Enchanted Book (books bind instantly, no choice).
                </p>
              </div>
            )}
            {hud.panel === "anvil" && (
              <div className="sc-station-body">
                <MenuButton variant="primary" icon={<HammerIcon size={20} />} onClick={() => game.mend()} hint="Spend 1 ingot">
                  Mend held tool
                </MenuButton>
                <MenuButton icon={<HammerIcon size={20} />} onClick={() => game.temper()} hint="Spend 1 level">
                  Temper held tool
                </MenuButton>
                <MenuButton icon={<StarIcon size={20} />} onClick={() => game.combine()} hint="Spend 2 levels · same rune and level as the off-hand → one level higher">
                  Combine with off-hand
                </MenuButton>
                <MenuButton variant="ghost" icon={<TrashIcon size={20} />} onClick={() => game.disenchant()} hint="Strip every rune off the held item">
                  Grindstone
                </MenuButton>
                {hud.heldEnch && <p className="sc-status">Held: ✦ {hud.heldEnch}</p>}
              </div>
            )}
            {hud.panel === "brew" && (
              <div className="sc-brew-grid">
                {brews.map((b) => (
                  <button key={b.id} className={"sc-brew" + (b.primary ? " primary" : "")} onClick={() => game.brew(b.id)}>
                    <strong>{b.label}</strong>
                    <small>{b.detail}</small>
                  </button>
                ))}
              </div>
            )}
            {hud.panel === "beacon" && (
              <div className="sc-station-body">
                <p className="sc-status">
                  {hud.beaconLevel > 0 ? `Pyramid level ${hud.beaconLevel} · blessing: ${hud.beaconBuff || "none chosen"}` : "No pyramid yet — stack iron, gold or aqua-gem blocks under the beacon: 3×3, then 5×5, 7×7, 9×9."}
                </p>
                {(
                  [
                    ["speed", "Swiftness", 1],
                    ["jump", "Leap", 1],
                    ["regen", "Renewal", 2],
                    ["strength", "Might", 3],
                  ] as const
                ).map(([id, name, lvl]) => (
                  <MenuButton key={id} variant={hud.beaconBuff === id ? "primary" : ""} icon={hud.beaconLevel < lvl ? <LockIcon size={20} /> : <StarIcon size={20} />} onClick={() => game.beacon(id)} disabled={hud.beaconLevel < lvl} hint={hud.beaconLevel < lvl ? `Needs pyramid level ${lvl}` : hud.beaconBuff === id ? "Active" : undefined}>
                    {name}
                  </MenuButton>
                ))}
              </div>
            )}
            {hud.panel === "trade" && (
              <div className="sc-station-body">
                <p className="sc-muted">{hud.traderBlurb}</p>
                <div className="sc-trade-meta">
                  <span className="sc-chip">{hud.traderLevel}</span>
                  <span className="sc-chip">{hud.traderNext}</span>
                  <span className={"sc-chip rep" + (hud.reputation < 0 ? " bad" : hud.reputation > 0 ? " good" : "")}>
                    {hud.repWord} ({hud.reputation > 0 ? "+" : ""}
                    {hud.reputation})
                  </span>
                </div>
                <ul className="sc-offers">
                  {hud.offers.map((offer, i) => (
                    <li key={i}>
                      <button className="sc-offer" disabled={offer.locked || offer.stock <= 0} onClick={() => game.trade(i)}>
                        <span className="sc-offer-side">
                          <span className="sc-offer-ic">
                            <ItemIcon id={offer.pay} />
                          </span>
                          <b>×{offer.pn}</b>
                        </span>
                        <span className="sc-arrow">→</span>
                        <span className="sc-offer-side">
                          <span className="sc-offer-ic">
                            <ItemIcon id={offer.out} />
                          </span>
                          <b>×{offer.on}</b>
                        </span>
                        <span className="sc-offer-text">
                          <strong>{offer.outName}</strong>
                          <small>
                            {offer.tier === 2 ? "Journeyman · " : offer.tier === 3 ? "Master · " : ""}
                            {offer.locked ? "Locked" : offer.stock <= 0 ? "Out of stock" : `${offer.stock} left`}
                          </small>
                        </span>
                        {offer.locked && <LockIcon size={16} />}
                      </button>
                    </li>
                  ))}
                </ul>
                {hud.trader === "Mechanic" && hud.prefabs.length > 0 && (
                  <>
                    <p className="sc-label">Vehicles — drive away today</p>
                    <ul className="sc-offers">
                      {hud.prefabs.map((p) => (
                        <li key={p.name}>
                          <button className="sc-offer" disabled={!p.afford} onClick={() => game.buyPrefab(p.name)}>
                            <span className="sc-offer-side">
                              <span className="sc-offer-ic">
                                <ItemIcon id={ID.PlasticIngot} />
                              </span>
                              <b>×{p.ingots}</b>
                            </span>
                            {p.copper > 0 && (
                              <span className="sc-offer-side">
                                <span className="sc-offer-ic">
                                  <ItemIcon id={ID.Copper} />
                                </span>
                                <b>×{p.copper}</b>
                              </span>
                            )}
                            <span className="sc-arrow">→</span>
                            <span className="sc-offer-text">
                              <strong>{p.name}</strong>
                              <small>
                                {p.parts} parts · delivered in front of you{p.afford ? "" : " · not enough matter"}
                              </small>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="sc-hint">Stock restocks every morning and afternoon. Trading builds your name here.</p>
                {hud.trader === "Clerk" && <QuestList hud={hud} onClaim={(id) => game.claim(id)} />}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function QuestList({ hud, onClaim }: { hud: GameApi["hud"]; onClaim: (id: string) => void }) {
  let lastChain = "";
  return (
    <ul className="sc-cards">
      {hud.quests.map((quest) => {
        const header = quest.chainName && quest.chainName !== lastChain ? quest.chainName : null;
        if (quest.chainName) lastChain = quest.chainName;
        return (
          <Fragment key={quest.id}>
            {header && (
              <li className="sc-chain-head">
                <strong>{header}</strong>
                {quest.from && <span>{quest.from}</span>}
              </li>
            )}
            <li className={"sc-card" + (quest.ready && !quest.done ? " glow" : "") + (quest.done ? " done" : "") + (quest.locked ? " locked" : "")}>
              <div className="sc-card-text">
                <strong>
                  {quest.name}
                  {quest.steps && quest.steps > 1 && <em className="sc-step"> · step {quest.step} of {quest.steps}</em>}
                </strong>
                <span>{quest.locked ? "Locked — finish the step before this one." : quest.detail}</span>
                <div className="sc-progress">
                  <span style={{ width: `${Math.min(100, (quest.n / Math.max(1, quest.need)) * 100)}%` }} />
                </div>
                <small>
                  {quest.done ? "Claimed" : `${quest.n} / ${quest.need}`} · Reward: {quest.reward}
                </small>
              </div>
              <button className={"sc-btn sc-btn-sm" + (quest.ready && !quest.done ? " sc-btn-primary" : "")} disabled={!quest.ready || quest.done} onClick={() => onClaim(quest.id)}>
                {quest.done ? <CheckIcon size={16} /> : quest.locked ? "🔒" : "Claim"}
              </button>
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}

function SkillTree({ hud, onUnlock }: { hud: GameApi["hud"]; onUnlock: (id: string) => void }) {
  const known = new Set(hud.skills);
  const branches = ["Miner", "Hunter", "Mason", "Mage"] as const;
  return (
    <div className="sc-skill-cols">
      {branches.map((branch) => (
        <div key={branch} className="sc-skill-col">
          <p className="sc-label">{branch}</p>
          <ul className="sc-cards">
            {SKILLS.filter((node) => node.branch === branch).map((node) => {
              const on = known.has(node.id);
              const locked = !!node.need && !known.has(node.need);
              return (
                <li key={node.id} className={"sc-card" + (on ? " learned" : "") + (locked ? " locked" : "")}>
                  <div className="sc-card-text">
                    <strong>
                      {node.name}
                      {node.rank ? <small> · rank {node.rank}</small> : null}
                    </strong>
                    <span>{node.detail}</span>
                  </div>
                  <button className={"sc-btn sc-btn-sm" + (!on && !locked && hud.skillPoints > 0 ? " sc-btn-primary" : "")} disabled={on || locked || hud.skillPoints <= 0} onClick={() => onUnlock(node.id)}>
                    {on ? <CheckIcon size={16} /> : locked ? <LockIcon size={16} /> : "Learn"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Ranks({ hud, game }: { hud: GameApi["hud"]; game: GameApi }) {
  const known = useMemo(() => new Set(hud.found), [hud.found]);
  const pct = Math.min(100, (hud.xp / Math.max(1, hud.xpNeed)) * 100);
  return (
    <div className="sc-ranks">
      <div className="sc-rank-hero">
        <span className="sc-rank-lv">{hud.level}</span>
        <div>
          <strong>{hud.rank}</strong>
          <div className="sc-progress big">
            <span style={{ width: `${pct}%` }} />
          </div>
          <small>
            {hud.xp} / {hud.xpNeed} studs{hud.nextPerk ? ` · next perk: ${hud.nextPerk}` : " · every perk unlocked"}
          </small>
        </div>
      </div>
      <p className="sc-label">Your path — build identity</p>
      <ul className="sc-cards">
        {PATHS.map((p) => {
          const active = hud.path === p.id;
          const changing = !!hud.path && !active;
          const afford = (hud.inv[ID.Emerald] ?? 0) >= PATH_CHANGE_COST;
          return (
            <li key={p.id} className={"sc-card" + (active ? " learned" : "")}>
              <div className="sc-card-text">
                <strong>
                  {p.name}
                  {active ? " — your path" : ""}
                </strong>
                <span>{p.bonus}</span>
              </div>
              {!active && (
                <MenuButton
                  variant={changing ? "ghost" : "primary"}
                  disabled={changing && !hud.creative && !afford}
                  onClick={() => game.choosePath(p.id)}
                  hint={changing ? `Changing your path costs ${PATH_CHANGE_COST} emeralds — identity is a commitment` : "Commit to this path — the first choice is free"}
                >
                  {changing ? `Change · ${PATH_CHANGE_COST} emeralds` : "Choose"}
                </MenuButton>
              )}
            </li>
          );
        })}
      </ul>
      <p className="sc-label">Perks</p>
      <ul className="sc-cards">
        {PERKS.map((perk) => (
          <li key={perk.level} className={"sc-card" + (hud.level >= perk.level ? " learned" : " locked")}>
            <div className="sc-card-text">
              <strong>
                Lv {perk.level} · {perk.name}
              </strong>
              <span>{perk.detail}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="sc-label">Stud codex</p>
      <ul className="sc-codex">
        {CODEX.map((entry) => {
          const seen = hud.creative || known.has(entry.id);
          return (
            <li key={entry.id} className={seen ? "" : "unknown"}>
              <span className="sc-codex-ic">
                <ItemIcon id={entry.id} muted={!seen} />
              </span>
              <div>
                <strong>{seen ? def(entry.id).name : "Unknown stud"}</strong>
                <span>{seen ? entry.where : "Not catalogued yet"}</span>
                {seen && (
                  <small>
                    {entry.use}
                    {entry.lvl ? ` Craft gate: rank ${entry.lvl}.` : ""}
                  </small>
                )}
              </div>
              {seen && !hud.creative && <em>{hud.inv[entry.id] ?? 0}</em>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
