import { useEffect, useRef, useState } from "react";
import { Drumstick, Droplets, Heart } from "lucide-react";
import { BLOCKS, CATALOG, COLORS, ID, def } from "./blocks";
import type { EnterKind, GameApi, Phase } from "./game";
import { RECIPES, type Recipe } from "./recipes";
import { CODEX, PERKS } from "./ranks";
import { ItemIcon } from "./icons";
import { SKILLS } from "./skills";
import type { WorldSlot } from "./save";

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pending = useRef<{ kind: EnterKind; seed: string; id?: string } | null>(null);
  const [api, setApi] = useState<GameApi | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    let mounted: GameApi | null = null;
    void import("./game")
      .then(({ mount }) => {
        if (dead || !canvasRef.current) return;
        mounted = mount(canvasRef.current);
        if (pending.current) {
          mounted.setSeed(pending.current.seed);
          mounted.enter(pending.current.kind, pending.current.id);
          pending.current = null;
        }
        setApi(mounted);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "The brick world failed to start");
      });
    return () => {
      dead = true;
      mounted?.destroy();
    };
  }, []);

  function start(kind: EnterKind, seed = "", id?: string) {
    if (api) {
      api.setSeed(seed);
      api.enter(kind, id);
    } else pending.current = { kind, seed, id };
  }

  return (
    <div className="game-root" role="application" aria-label="Studcraft">
      <canvas ref={canvasRef} className="world" />
      {api ? (
        <Overlay game={api} />
      ) : (
        <TitleScreen game={null} onEnter={start} booting error={error} />
      )}
    </div>
  );
}

function SignEditor({ game }: { game: GameApi }) {
  const at = game.hud.signEdit;
  const [text, setText] = useState(at?.text ?? "");
  if (!at) return null;
  return (
    <div className="menu-wrap">
      <section className="card sheet">
        <p className="eyebrow">Sign</p>
        <h2>Write on the sign</h2>
        <label className="seed-row">
          <input
            type="text"
            value={text}
            maxLength={60}
            spellCheck={false}
            aria-label="Sign text"
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") game.setSignText(text);
              if (e.key === "Escape") game.cancelSignEdit();
            }}
          />
        </label>
        <div className="stack">
          <button className="btn btn-primary" type="button" onClick={() => game.setSignText(text)}>
            Carve it
          </button>
          <button className="btn" type="button" onClick={() => game.cancelSignEdit()}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

function Overlay({ game }: { game: GameApi }) {
  const [, poke] = useState(0);
  useEffect(() => game.subscribe(() => poke((n) => n + 1)), [game]);
  const phase: Phase = game.phase;
  const hud = game.hud;
  useEffect(() => {
    const root = document.querySelector(".game-root");
    root?.classList.toggle("show-touch", phase === "play" && !hud.locked);
  }, [phase, hud.locked]);

  return (
    <>
      {phase === "title" && (
        <TitleScreen game={game} onEnter={(kind, seed, id) => { game.setSeed(seed); game.enter(kind, id); }} booting={false} error={null} />
      )}
      {phase === "play" && !hud.hidden && <Hud game={game} />}
      {phase === "play" && hud.signEdit && <SignEditor game={game} />}
      {phase === "play" && <TouchControls game={game} />}
      {phase === "pause" && <PauseMenu game={game} />}
      {phase === "inventory" && <Inventory game={game} />}
      {phase === "dead" && (
        <div className="menu-wrap">
          <section className="card">
            <p className="eyebrow">Scattered</p>
            <h1>
              Crum<span className="craft">pled</span>
            </h1>
            <p className="lede">Your bricks are on the ground where you fell. The bed still knows the way back.</p>
            <div className="stack">
              <button className="btn btn-primary" onClick={() => game.respawn()}>
                Respawn
              </button>
              <button className="btn" onClick={() => game.quit()}>
                Save and quit
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="flash" style={{ opacity: hud.flash * 0.45 }} />
      <div className="water-veil" style={{ opacity: hud.eyeWater ? 0.28 : 0 }} />
      <div className="rain-veil" style={{ opacity: hud.rain && phase === "play" ? 0.28 : 0 }} />
    </>
  );
}

function TitleScreen({
  game,
  onEnter,
  booting,
  error,
}: {
  game: GameApi | null;
  onEnter: (kind: EnterKind, seed: string, id?: string) => void;
  booting: boolean;
  error: string | null;
}) {
  const [seedText, setSeedText] = useState(() => {
    try {
      return sessionStorage.getItem("studcraft-pending-seed") || String((Math.random() * 1e9) | 0);
    } catch {
      return String((Math.random() * 1e9) | 0);
    }
  });
  const slots = game?.slots ?? [];
  const [showOptions, setShowOptions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    try {
      sessionStorage.setItem("studcraft-pending-seed", seedText);
    } catch {
      /* ignore */
    }
  }, [seedText]);
  function roll() {
    setSeedText(String((Math.random() * 1e9) | 0));
  }
  return (
    <div className="title-wrap">
      <section className="card">
        <div className="swatch-row" aria-hidden="true">
          {[ID.Red, ID.Yellow, ID.Blue, ID.Green].map((id) => (
            <span key={id} style={{ background: BLOCKS[id].color }} />
          ))}
        </div>
        <p className="eyebrow">Open world bricks</p>
        <h1>
          Stud<span className="craft">craft</span>
        </h1>
        <p className="lede">
          An infinite brick land. Type a seed, or roll one. The same seed builds the same hills, ores, and hamlets.
        </p>
        {error && <p className="lede">{error}</p>}
        <label className="seed-row">
          <span>Seed</span>
          <input
            type="text"
            value={seedText}
            maxLength={48}
            spellCheck={false}
            aria-label="World seed"
            onChange={(e) => setSeedText(e.target.value)}
          />
          <button className="btn btn-yellow" type="button" onClick={roll}>
            Roll
          </button>
        </label>
        <div className="stack">
          <button className="btn btn-primary" onClick={() => onEnter("survival", seedText)}>
            Survival
          </button>
          <button className="btn" onClick={() => onEnter("play", seedText)}>
            Creative
          </button>
          <button className="btn btn-green" onClick={() => onEnter("flat", seedText)}>
            Baseplate
          </button>
          {game && !showOptions && (
            <button className="btn" onClick={() => setShowOptions(true)}>
              Options
            </button>
          )}
        </div>
        {game && showOptions && (
          <>
            <SettingsPanel game={game} />
            <button className="btn btn-primary" onClick={() => setShowOptions(false)}>
              Done
            </button>
          </>
        )}
        {slots.length > 0 && (
          <>
            <p className="eyebrow">Saved seeds</p>
            <ul className="world-list">
              {slots.map((slot) => (
                <li key={slot.id}>
                  <button className="btn" onClick={() => onEnter("continue", slot.seedText, slot.id)}>
                    {slotLabel(slot)}
                  </button>
                  <button className="btn" onClick={() => game?.deleteSlot(slot.id)} aria-label={"Drop " + slot.seedText}>
                    Drop
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {!showHelp && (
            <button className="btn" onClick={() => setShowHelp(true)}>
              How to play
            </button>
          )}
          {showHelp && (
            <>
              <ul className="hints">
          <li>WASD move · Space jump · double-tap Space flies in creative</li>
          <li>The world keeps going. Horizon in the pause menu is only how far bricks draw</li>
          <li>Hamlets repeat across the map. Traders show up when you walk into town</li>
          <li>Skills spend rank levels. Pause holds four mods. Q cycles spells when you hold a tome</li>
          <li>Caves run under the hills. Water spills. A repeater delays a signal. A ruined gate by the first hamlet opens the Nether</li>
          <li>Water and magma spread from a source. Look where a piston or repeater should point</li>
          <li>Hold to mine · place with the other click · E opens the bin</li>
        </ul>
              <button className="btn" onClick={() => setShowHelp(false)}>
                Hide help
              </button>
            </>
          )}
        <p className="fine">
          {booting ? "Stacking the first bricks…" : "An original brick sandbox. Not a toy brand, not a block game."}
        </p>
      </section>
    </div>
  );
}

function slotLabel(slot: WorldSlot) {
  const mode = slot.flat ? "Baseplate" : slot.creative ? "Creative" : "Survival";
  return mode + " · " + slot.seedText;
}

function Hud({ game }: { game: GameApi }) {
  const hud = game.hud;
  const hearts = 10;
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
  return (
    <div className={hud.health > 0 && hud.health <= 6 && !hud.creative ? "hud hurt" : "hud"}>
      <div className="top-readout">
        <strong>{hud.biome}</strong>
        <span>
          {hud.timeLabel}
          {hud.flying ? " · flying" : ""}
          {hud.hammer ? " · hammer" : ""}
          {hud.creative ? " · creative" : ""}
          {" · "}
          {hud.realm}
          {hud.effect ? " · " + hud.effect : ""}
          {hud.questAlert ? " · " + hud.questAlert : ""}
          {hud.questTrack ? " · " + hud.questTrack : ""}
          {hud.won ? " · The End is yours" : ""}
        </span>
        <span>
          {Math.floor(hud.x)} {Math.floor(hud.y)} {Math.floor(hud.z)} · seed {hud.seedText || hud.seed}
        </span>
      </div>
      {hud.boss && (
        <div
          style={{
            position: "absolute",
            top: 54,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(460px, 72vw)",
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <div style={{ color: "#e9d5ff", fontWeight: 700, letterSpacing: 2, fontSize: 13, textShadow: "0 1px 3px #000" }}>{hud.boss}</div>
          <div style={{ height: 10, marginTop: 4, border: "1px solid #2a1848", background: "rgba(10,6,24,0.72)", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.round(hud.bossHp * 100)}%`,
                background: hud.bossHp < 0.35 ? "#e23b2f" : "#a855f7",
                transition: "width 0.25s ease",
              }}
            />
          </div>
        </div>
      )}
      {!hud.locked && !hud.message && <p className="look-hint">Drag to look · click to capture the mouse</p>}
      {hud.message && (
        <p className="toast">
          <i />
          {hud.message}
        </p>
      )}
      <div className="crosshair" />
      {hud.mine > 0 && (
        <div className="mine-track">
          <span style={{ width: `${hud.mine * 100}%` }} />
        </div>
      )}
      {hud.targetName && <div className="target-name">{hud.targetName}</div>}
      {!hud.creative && (
        <div className="hunger" aria-label={`${hud.hunger} hunger`}>
          {Array.from({ length: 10 }, (_, i) => (
            <Drumstick key={i} size={15} className={i < Math.ceil(hud.hunger / 2) ? "drum" : "drum off"} />
          ))}
        </div>
      )}
      {!hud.creative && (
        <div className="hearts" aria-label={`${hud.health} health`}>
          {Array.from({ length: hearts }, (_, i) => {
            const full = i < Math.floor(hud.health / 2);
            const half = !full && hud.health % 2 === 1 && i === Math.floor(hud.health / 2);
            return (
              <Heart
                key={i}
                size={16}
                className={full ? "heart" : half ? "heart half" : "heart off"}
                fill="currentColor"
              />
            );
          })}
        </div>
      )}
      {hud.oxygen < 10 && (
        <div className="oxygen" aria-label="air">
          {Array.from({ length: 10 }, (_, i) => (
            <Droplets key={i} size={14} style={{ opacity: i < Math.ceil(hud.oxygen) ? 1 : 0.25 }} />
          ))}
        </div>
      )}
      <div className="xp-track" aria-label={`${hud.rank}, level ${hud.level}`}>
        <span style={{ width: `${Math.min(100, (hud.xp / Math.max(1, hud.xpNeed)) * 100)}%` }} />
        <em>{hud.creative ? "Creative" : `Lv ${hud.level} · ${hud.rank}`}</em>
      </div>
      {hud.spellsOn && (
        <div className="mana-track" aria-label={`${hud.spell || "no spell"}, ${Math.floor(hud.mana)} mana`}>
          <span style={{ width: `${Math.min(100, (hud.mana / Math.max(1, hud.manaMax)) * 100)}%` }} />
          <em>{hud.spell ? `${hud.spell} · ${Math.floor(hud.mana)}/${hud.manaMax}` : "No spell"}</em>
        </div>
      )}
      <div
        className="hotbar"
        onPointerDown={(e) => {
          if (e.shiftKey || e.button !== 0) return;
          swipeAt.current = -1;
          e.currentTarget.setPointerCapture(e.pointerId);
          const i = pickSlot(e.currentTarget, e.clientX);
          swipeFrom.current = i;
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          pickSlot(e.currentTarget, e.clientX);
        }}
        onPointerUp={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const from = swipeFrom.current;
          const to = swipeAt.current;
          if (from >= 0 && to >= 0 && from !== to && hud.hotbar[from]?.id > 0) {
            game.swapSlots(from, to);
          }
          swipeFrom.current = -1;
        }}
      >
        {hud.hotbar.map((item, i) => (
          <button
            key={i}
            className={i === hud.slot ? "slot on" : "slot"}
            title={item.id > 0 ? def(item.id).name : ""}
            onClick={(e) => (e.shiftKey && item.id > 0 ? game.shiftStack(item.id) : game.setSlot(i))}
            onContextMenu={(e) => {
              if (item.id <= 0) return;
              e.preventDefault();
              game.shiftStack(item.id);
            }}
          >
            <small>{i + 1}</small>
            {item.id > 0 && <ItemIcon id={item.id} />}
            {item.id > 0 && item.count >= 0 && <em>{item.count}</em>}
          </button>
        ))}
      </div>
    </div>
  );
}

function GraphicsSettings({ game }: { game: GameApi }) {
  const s = game.settings;
  return (
    <div className="settings">
      <label>
        Quality
        <span className="seg">
          {(["auto", "high", "balanced", "performance"] as const).map((q) => (
            <button key={q} type="button" className={s.quality === q ? "on" : ""} onClick={() => game.setQuality(q)}>
              {q}
            </button>
          ))}
        </span>
      </label>
      <label>
        Speed
        <span className="fps-read">{game.hud.fps} fps</span>
      </label>
      <label>
        Horizon {s.radius}
        <input type="range" min={2} max={14} step={1} value={s.radius} onChange={(e) => game.setRadius(Number(e.target.value))} />
      </label>
      <label>
        Studs
        <input type="checkbox" checked={s.studs} onChange={(e) => game.setStuds(e.target.checked)} />
      </label>
      <label>
        Realistic
        <input type="checkbox" checked={s.realistic} onChange={(e) => game.setRealistic(e.target.checked)} />
      </label>
    </div>
  );
}

function GameplaySettings({ game }: { game: GameApi }) {
  const s = game.settings;
  return (
    <div className="settings">
      <label>
        Look
        <input type="range" min={0.4} max={2.2} step={0.1} value={s.sens} onChange={(e) => game.setSens(Number(e.target.value))} />
      </label>
      <label>
        Sound
        <input type="checkbox" checked={s.sound} onChange={(e) => game.setSound(e.target.checked)} />
      </label>
      <label>
        Outside view
        <input type="checkbox" checked={s.third} onChange={(e) => game.setThird(e.target.checked)} />
      </label>
    </div>
  );
}

function ModSettings({ game }: { game: GameApi }) {
  const s = game.settings;
  return (
    <div className="settings">
      <label>
        Hard nights
        <input type="checkbox" checked={s.mods.hard} onChange={(e) => game.setMod("hard", e.target.checked)} />
      </label>
      <label>
        Generous parts
        <input type="checkbox" checked={s.mods.generous} onChange={(e) => game.setMod("generous", e.target.checked)} />
      </label>
      <label>
        Peaceful bricks
        <input type="checkbox" checked={s.mods.peaceful} onChange={(e) => game.setMod("peaceful", e.target.checked)} />
      </label>
      <label>
        Spellcraft
        <input type="checkbox" checked={s.mods.spells} onChange={(e) => game.setMod("spells", e.target.checked)} />
      </label>
    </div>
  );
}

function SettingsPanel({ game }: { game: GameApi }) {
  return (
    <>
      <h3 className="sect">Graphics</h3>
      <GraphicsSettings game={game} />
      <h3 className="sect">Gameplay</h3>
      <GameplaySettings game={game} />
      <h3 className="sect">World mods</h3>
      <ModSettings game={game} />
    </>
  );
}

function PauseMenu({ game }: { game: GameApi }) {
  return (
    <div className="menu-wrap">
      <section className="card pause-card">
        <p className="eyebrow">Paused</p>
        <h1>
          Stud<span className="craft">craft</span>
        </h1>
        <div className="stack pause-actions">
          <button className="btn btn-primary big" onClick={() => game.resume()}>
            ▶ Resume
          </button>
          <button className="btn" onClick={() => game.toggleInventory()}>
            🎒 Brick bin
          </button>
          <button className="btn" onClick={() => game.quit()}>
            Save and quit
          </button>
        </div>
        <SettingsPanel game={game} />
        <p className="fine">
          Seed {game.hud.seedText || game.hud.seed}. The land does not end. Horizon is only the draw distance.
        </p>
        <button className="btn" onClick={() => game.copySeed()}>
          Copy seed
        </button>
      </section>
    </div>
  );
}

function BinGrid({ game, hud }: { game: GameApi; hud: GameApi["hud"] }) {
  return (
    <div className="grid-blocks">
          {CATALOG.map((id) => {
            const count = hud.creative ? -1 : (hud.inv[id] ?? 0);
            const empty = !hud.creative && count <= 0;
            return (
              <button
                key={id}
                data-empty={empty}
                onClick={(e) => {
                  if (e.shiftKey) {
                    game.shiftStack(id);
                    return;
                  }
                  // double-tap (mobile hybrid) also moves the stack
                  const now = Date.now();
                  const last = (e.currentTarget as HTMLButtonElement).dataset.tap ?? "0";
                  if (now - Number(last) < 320) {
                    game.shiftStack(id);
                    (e.currentTarget as HTMLButtonElement).dataset.tap = "0";
                    return;
                  }
                  (e.currentTarget as HTMLButtonElement).dataset.tap = String(now);
                  game.hold(id);
                  game.assign(id);
                }}
                onPointerDown={() => {
                  const start = Date.now();
                  const up = () => {
                    if (Date.now() - start > 420) game.shiftStack(id);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointerup", up);
                }}
              >
                <ItemIcon id={id} />
                {def(id).name}
                <span>{hud.creative ? "all" : count}</span>
              </button>
            );
          })}
        </div>
  );
}

function BinPage({ game }: { game: GameApi }) {
  const hud = game.hud;
  return (
    <>
      <p className="sect">Armor — tap a piece to swap with the held brick</p>
      <div className="armor-row">
            {hud.armor.map((id, i) => (
              <button key={i} className="slot" onClick={() => game.armorTap(i)}>
                {id > 0 ? <ItemIcon id={id} /> : <small>{["Cap", "Shell", "Legs", "Boots"][i]}</small>}
              </button>
            ))}
          </div>
      <p className="sect">Bricks — tap to hold, long-press or double-tap moves a stack</p>
      <BinGrid game={game} hud={hud} />
      <p className="lede">Cursor: {hud.cursor ? def(hud.cursor).name : "empty"}.</p>
      <p className="sect">Color press — spends one spare brick</p>
      <div className="colors">
        {COLORS.map((id) => (
          <button
            key={id}
            style={{ background: def(id).color }}
            aria-label={def(id).name}
            onClick={(e) => (e.shiftKey ? game.shiftStack(id) : game.press(id))}
          />
        ))}
      </div>
    </>
  );
}

function CraftPage({ game }: { game: GameApi }) {
  const hud = game.hud;
  const bench = hud.panel === "bench";
  const [book, setBook] = useState<"all" | "build" | "tools" | "magic" | "gear" | "food">("all");
  const [sel, setSel] = useState("");
  const [showGrid, setShowGrid] = useState(false);
  const list = RECIPES.filter((recipe) => book === "all" || recipe.cat === book);
  const recipe = list.find((entry) => entry.id === sel) ?? list[0];
  const afford = (entry: Recipe, times = 1) => hud.creative || entry.need.every(([id, n]) => (hud.inv[id] ?? 0) >= n * times);
  return (
    <>
      <div className="chips">
        {(["all", "build", "tools", "magic", "gear", "food"] as const).map((cat) => (
          <button key={cat} className={book === cat ? "chip on" : "chip"} onClick={() => setBook(cat)}>
            {cat === "all" ? "All" : cat[0].toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      <div className="craft-layout">
        <div className="recipe-list">
          {list.map((entry) => (
            <button key={entry.id + "-" + entry.name} className={recipe && entry.id === recipe.id ? "recipe-row on" : "recipe-row"} onClick={() => setSel(entry.id)}>
              <span className="recipe-ic">
                <ItemIcon id={entry.out > 0 ? entry.out : ID.AxeW} />
              </span>
              <span className="recipe-tx">
                <strong>{entry.name}</strong>
                <small>{entry.detail}</small>
              </span>
              <span className={afford(entry) ? "dot ok" : "dot"} aria-hidden="true" />
            </button>
          ))}
        </div>
        {recipe && (
          <div className="recipe-detail">
            <div className="rd-head">
              <span className="rd-ic">
                <ItemIcon id={recipe.out > 0 ? recipe.out : ID.AxeW} />
              </span>
              <div>
                <strong>{recipe.name}</strong>
                <small>
                  {recipe.detail} · makes {recipe.n}
                  {recipe.lvl ? ` · level ${recipe.lvl}` : ""}
                  {recipe.skill ? ` · ${recipe.skill} skill` : ""}
                </small>
              </div>
            </div>
            {recipe.shape && recipe.w && recipe.h ? (
              <div className="shape-grid" style={{ gridTemplateColumns: `repeat(${recipe.w}, 34px)` }}>
                {recipe.shape.map((id, i) => (
                  <span key={i} className={id > 0 ? "shape-cell" : "shape-cell empty"}>
                    {id > 0 && <ItemIcon id={id} />}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="need-chips">
              {recipe.need.map(([id, n]) => {
                const have = hud.creative ? n : (hud.inv[id] ?? 0);
                return (
                  <span key={id} className={have >= n ? "need ok" : "need miss"}>
                    <ItemIcon id={id} /> {def(id).name} {have}/{n}
                  </span>
                );
              })}
            </div>
            <div className="craft-actions">
              <button className="btn btn-primary big" disabled={!afford(recipe)} onClick={() => game.craft(recipe.id)}>
                ⚒️ Craft
              </button>
              {!recipe.special && (
                <button
                  className="btn big"
                  disabled={!afford(recipe, 5)}
                  onClick={() => {
                    for (let i = 0; i < 5; i++) game.craft(recipe.id);
                  }}
                >
                  ×5
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <button className="btn grid-toggle" onClick={() => setShowGrid(!showGrid)}>
        {showGrid ? "Hide the manual grid" : "Manual grid — tap bricks into the pattern yourself"}
      </button>
      {showGrid && (
        <>
          <div className="craft-grid">
            {hud.grid.map((id, i) => (
              <button key={i} className="slot" onClick={() => game.gridTap(i)} disabled={!bench && i % 3 === 2}>
                {id > 0 && <ItemIcon id={id} />}
              </button>
            ))}
            <button className="slot out" onClick={() => game.craftTake()}>
              {hud.craftOut ? <ItemIcon id={hud.craftOut.id} /> : <small>Out</small>}
              {hud.craftOut && hud.craftOut.n > 1 ? <em>{hud.craftOut.n}</em> : null}
            </button>
          </div>
          <p className="fine">{bench ? "Workbench grid: all 9 cells." : "Pocket grid: 2×2. A workbench unlocks the full 3×3."} Tap the output to take it.</p>
        </>
      )}
    </>
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
  };
  return (
    <div className="sheet-wrap">
      <section className="card sheet hub">
        <header className="sheet-head">
          <div>
            <p className="eyebrow">Station</p>
            <h1>{titles[hud.panel] ?? hud.panel}</h1>
          </div>
          <button className="btn x" aria-label="Close" onClick={() => game.toggleInventory()}>
            ✕
          </button>
        </header>
        <div className="hub-body">
          {hud.panel === "furnace" && (
            <>
              <div className="station-slots">
                <figure>
                  <button className="slot big" onClick={() => game.furnaceTap(0)}>
                    {hud.furnace.in ? <ItemIcon id={hud.furnace.in} /> : <small>Ore</small>}
                    {hud.furnace.inN > 0 && <em>{hud.furnace.inN}</em>}
                  </button>
                  <figcaption>Ore</figcaption>
                </figure>
                <span className="station-arrow">🔥</span>
                <figure>
                  <button className="slot big" onClick={() => game.furnaceTap(1)}>
                    {hud.furnace.fuel ? <ItemIcon id={hud.furnace.fuel} /> : <small>Fuel</small>}
                    {hud.furnace.fuelN > 0 && <em>{hud.furnace.fuelN}</em>}
                  </button>
                  <figcaption>Fuel</figcaption>
                </figure>
                <span className="station-arrow">→</span>
                <figure>
                  <button className="slot big out" onClick={() => game.furnaceTap(2)}>
                    {hud.furnace.out ? <ItemIcon id={hud.furnace.out} /> : <small>Out</small>}
                    {hud.furnace.outN > 0 && <em>{hud.furnace.outN}</em>}
                  </button>
                  <figcaption>Out</figcaption>
                </figure>
              </div>
              <div className="cook-bar">
                <span style={{ width: `${Math.round(hud.furnace.cook * 100)}%` }} />
              </div>
              <p className="fine">Hold a brick below, then tap a slot to load it. Tap Out to collect.</p>
              <BinGrid game={game} hud={hud} />
            </>
          )}
          {hud.panel === "chest" && (
            <>
              <div className="grid-blocks chest">
                {hud.chest.map((cell, i) => (
                  <button key={i} onClick={() => game.chestTap(i)}>
                    {cell.id > 0 && <ItemIcon id={cell.id} />}
                    {cell.n > 0 && <span>{cell.n}</span>}
                  </button>
                ))}
              </div>
              <p className="fine">Tap a chest cell, then a brick below — or the other way round.</p>
              <BinGrid game={game} hud={hud} />
            </>
          )}
          {hud.panel === "enchant" && (
            <div className="stack">
              <button className="btn btn-primary big" onClick={() => game.enchant()}>
                ✨ Spend 3 levels — enchant the held piece
              </button>
              <p className="fine">
                Random runes for what you hold: blades take Sharpness, Fire Aspect, Knockback; picks take Efficiency and Fortune; bows take
                Power and Flame; armor takes Protection; boots can learn Feather Fall. Anything sturdy can learn Unbreaking.
              </p>
              {hud.heldEnch && <p className="fine">Held now: ✦ {hud.heldEnch}</p>}
            </div>
          )}
          {hud.panel === "anvil" && (
            <div className="stack">
              <button className="btn btn-primary big" onClick={() => game.mend()}>
                🔨 Spend 1 ingot — mend the held tool
              </button>
              <button className="btn big" onClick={() => game.temper()}>
                Spend 1 level — temper the held tool
              </button>
              <button className="btn big" onClick={() => game.combine()}>
                Spend 2 levels — combine with the off-hand twin (same rune, same level → one level higher)
              </button>
              {hud.heldEnch && <p className="fine">Held now: ✦ {hud.heldEnch}</p>}
            </div>
          )}
          {hud.panel === "brew" && (
            <div className="stack">
              <button className="btn big" onClick={() => game.brew("heal")}>
                🧪 Bottle + apple → mend brew
              </button>
              <button className="btn big" onClick={() => game.brew("speed")}>
                🧪 Bottle + wart → dash brew
              </button>
              <button className="btn big" onClick={() => game.brew("might")}>
                🧪 Bottle + ember rod → might brew
              </button>
              <button className="btn big" onClick={() => game.brew("focus")}>
                🧪 Bottle + amber → focus brew · level 6
              </button>
              <button className="btn btn-primary big" onClick={() => game.brew("base")}>
                ⚗️ Bottle + wart → base brew — every chain brew starts here
              </button>
              <button className="btn big" onClick={() => game.brew("regen")}>
                Base + fang → regen brew (heal over time)
              </button>
              <button className="btn big" onClick={() => game.brew("fireward")}>
                Base + cinder → ward brew (fire can't touch you)
              </button>
              <button className="btn big" onClick={() => game.brew("leap")}>
                Base + feather → leap brew (jump higher)
              </button>
              <button className="btn big" onClick={() => game.brew("gill")}>
                Base + fish → gill brew (swim like one)
              </button>
              <button className="btn big" onClick={() => game.brew("veil")}>
                Base + frost → veil brew (mobs stop seeing you)
              </button>
              <button className="btn big" onClick={() => game.brew("venom")}>
                Base + red mushroom → venom brew
              </button>
              <button className="btn big" onClick={() => game.brew("tar")}>
                Base + slime → tar brew (heavy feet)
              </button>
              <button className="btn big" onClick={() => game.brew("splashvenom")}>
                💥 Venom brew + powder → venom splash (throw it)
              </button>
              <button className="btn big" onClick={() => game.brew("splashtar")}>
                💥 Tar brew + powder → tar splash (throw it)
              </button>
            </div>
          )}
          {hud.panel === "trade" && (
            <div className="stack">
              <p className="lede">{hud.traderBlurb}</p>
              <p className="lede">
                {hud.traderLevel} · {hud.traderNext}
              </p>
              {hud.offers.map((offer, i) => (
                <button key={i} className="btn big" disabled={offer.locked} onClick={() => game.trade(i)}>
                  {offer.pn} {offer.payName} → {offer.on} {offer.outName}
                  {offer.tier === 2 ? " · Journeyman" : offer.tier === 3 ? " · Master" : ""}
                  {offer.locked ? " 🔒" : ""}
                </button>
              ))}
              {hud.trader === "Clerk" && <QuestList hud={hud} onClaim={(id) => game.claim(id)} />}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Inventory({ game }: { game: GameApi }) {
  const hud = game.hud;
  const station =
    hud.panel === "furnace" || hud.panel === "chest" || hud.panel === "enchant" || hud.panel === "anvil" || hud.panel === "brew" || hud.panel === "trade";
  const [page, setPage] = useState<"bin" | "craft" | "ranks" | "quests" | "skills">("bin");
  const known = new Set(hud.found);
  if (station) return <StationScreen game={game} />;
  const titles = {
    bin: "Brick bin",
    craft: "Crafting",
    ranks: hud.rank,
    quests: "Quest board",
    skills: `${hud.skillPoints} skill points`,
  };
  const tabs = [
    { id: "bin", icon: "🎒", label: "Bin" },
    { id: "craft", icon: "⚒️", label: "Craft" },
    { id: "ranks", icon: "🏅", label: "Ranks" },
    { id: "quests", icon: "📜", label: "Quests" },
    { id: "skills", icon: "🌟", label: "Skills" },
  ] as const;
  return (
    <div className="sheet-wrap">
      <section className="card sheet hub">
        <header className="sheet-head">
          <div>
            <p className="eyebrow">
              {page === "ranks" ? "Builder rank" : page === "quests" ? "Hamlet board" : page === "skills" ? "Skill tree" : hud.panel === "bench" ? "Workbench" : "Backpack"}
            </p>
            <h1>{titles[page]}</h1>
          </div>
          <button className="btn x" aria-label="Close" onClick={() => game.toggleInventory()}>
            ✕
          </button>
        </header>
        <div className="hub-body">
          {page === "bin" && <BinPage game={game} />}
          {page === "craft" && <CraftPage game={game} />}
          {page === "ranks" && <Ranks hud={hud} known={known} />}
          {page === "quests" && <QuestList hud={hud} onClaim={(id) => game.claim(id)} />}
          {page === "skills" && <SkillTree hud={hud} onUnlock={(id) => game.unlock(id)} />}
        </div>
        <nav className="hub-tabs">
          {tabs.map((tab) => (
            <button key={tab.id} className={page === tab.id ? "on" : ""} onClick={() => setPage(tab.id)}>
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </section>
    </div>
  );
}

function QuestList({ hud, onClaim }: { hud: GameApi["hud"]; onClaim: (id: string) => void }) {
  return (
    <ul className="perk-list quest-list">
      {hud.quests.map((quest) => (
        <li key={quest.id} data-on={quest.ready && !quest.done}>
          <div>
            <strong>{quest.name}</strong>
            <span>{quest.detail}</span>
            <span>
              {quest.done ? "Claimed" : `${quest.n} / ${quest.need}`} · {quest.reward}
            </span>
          </div>
          <button className="btn" disabled={!quest.ready || quest.done} onClick={() => onClaim(quest.id)}>
            {quest.done ? "Claimed" : "Claim"}
          </button>
        </li>
      ))}
    </ul>
  );
}

function SkillTree({ hud, onUnlock }: { hud: GameApi["hud"]; onUnlock: (id: string) => void }) {
  const known = new Set(hud.skills);
  const branches = ["Miner", "Hunter", "Mason", "Mage"] as const;
  return (
    <div className="ranks">
      <p className="lede">
        {hud.skillPoints} point{hud.skillPoints === 1 ? "" : "s"} left. Each builder level is one point. Learn a node and it stays, even if a rune table spends the level.
      </p>
      {branches.map((branch) => (
        <div key={branch}>
          <p className="eyebrow">{branch}</p>
          <ul className="perk-list skill-list">
            {SKILLS.filter((node) => node.branch === branch).map((node) => {
              const on = known.has(node.id);
              const locked = !!node.need && !known.has(node.need);
              return (
                <li key={node.id} data-on={on}>
                  <div>
                    <strong>
                      {node.name}
                      {node.rank ? ` · lv ${node.rank}` : ""}
                    </strong>
                    <span>{node.detail}</span>
                  </div>
                  <button className="btn" disabled={on || locked} onClick={() => onUnlock(node.id)}>
                    {on ? "Learned" : locked ? "Locked" : "Learn"}
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

function Ranks({ hud, known }: { hud: GameApi["hud"]; known: Set<number> }) {
  const pct = Math.min(100, (hud.xp / Math.max(1, hud.xpNeed)) * 100);
  return (
    <div className="ranks">
      <p className="lede">
        Level {hud.level}
        {hud.nextPerk ? ` · next perk ${hud.nextPerk}` : " · every stud is yours"}. The bar under the hotbar fills as you mine rare studs, smelt, and fight.
      </p>
      <div className="rank-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="fine">
        {hud.xp} / {hud.xpNeed} studs. The rune table enchants the held piece for 3 levels — real runes now (Sharpness, Fortune, Protection, Flame…), and the anvil combines a piece with its off-hand twin to push a rune one level higher. Tin and copper hide in mid stone. Amber, chrome, and sapphire sit deeper.
        Prism hugs the baseplate core and the End. Resin sweats on the nether floor.
      </p>
      <ul className="perk-list">
        {PERKS.map((perk) => (
          <li key={perk.level} data-on={hud.level >= perk.level}>
            <div>
              <strong>
                Lv {perk.level} · {perk.name}
              </strong>
              <span>{perk.detail}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="eyebrow">Stud codex</p>
      <ul className="codex">
        {CODEX.map((entry) => {
          const seen = hud.creative || known.has(entry.id);
          return (
            <li key={entry.id}>
              <ItemIcon id={entry.id} muted={!seen} />
              <div>
                <strong>{seen ? def(entry.id).name : "Unknown stud"}</strong>
                <span>{seen ? entry.where : "Not catalogued yet"}</span>
                {seen && (
                  <span>
                    {entry.use}
                    {entry.lvl ? ` Craft gate: level ${entry.lvl}.` : ""}
                  </span>
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

function TouchControls({ game }: { game: GameApi }) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 40, y: 40 });

  function setMove(x: number, y: number) {
    game.touch.moveX = x;
    game.touch.moveY = y;
  }

  return (
    <div className="touch-layer">
      <div
        className="stick-zone"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          origin.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!origin.current || origin.current.id !== e.pointerId) return;
          const dx = e.clientX - origin.current.x;
          const dy = e.clientY - origin.current.y;
          const max = 48;
          const m = Math.hypot(dx, dy) || 1;
          const scale = Math.min(1, max / m);
          setKnob({ x: 44 + dx * scale, y: 44 + dy * scale });
          setMove((dx * scale) / max, -(dy * scale) / max);
        }}
        onPointerUp={(e) => {
          if (origin.current?.id === e.pointerId) {
            origin.current = null;
            setKnob({ x: 40, y: 40 });
            setMove(0, 0);
          }
        }}
        onPointerCancel={() => {
          origin.current = null;
          setKnob({ x: 40, y: 40 });
          setMove(0, 0);
        }}
      >
        <div className="stick-knob" style={{ left: knob.x, top: knob.y }} />
      </div>
      <button
        className="touch-pause"
        aria-label="Pause and options"
        onClick={() => {
          game.touch.mine = false;
          game.touch.place = false;
          game.touch.jump = false;
          game.pauseGame();
        }}
      >
        ⏸
      </button>
      <div className="touch-actions">
        <HoldButton label="Mine" onHold={(v) => (game.touch.mine = v)} />
        <HoldButton label="Place" onHold={(v) => (game.touch.place = v)} />
        <HoldButton label="Jump" onHold={(v) => (game.touch.jump = v)} />
        <button
          onClick={() => {
            game.touch.mine = false;
            game.touch.place = false;
            game.touch.jump = false;
            game.toggleInventory();
          }}
        >
          Bin
        </button>
      </div>
    </div>
  );
}

function HoldButton({ label, onHold }: { label: string; onHold: (down: boolean) => void }) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onHold(true);
        if (navigator.vibrate) navigator.vibrate(12);
      }}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {label}
    </button>
  );
}
