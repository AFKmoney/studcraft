import { useEffect, useRef, useState } from "react";
import { Drumstick, Droplets, Heart } from "lucide-react";
import { BLOCKS, CATALOG, COLORS, ID, def } from "./blocks";
import type { EnterKind, GameApi, Phase } from "./game";
import { RECIPES } from "./recipes";
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
        </div>
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
        <ul className="hints">
          <li>WASD move · Space jump · double-tap Space flies in creative</li>
          <li>The world keeps going. Horizon in the pause menu is only how far bricks draw</li>
          <li>Hamlets repeat across the map. Traders show up when you walk into town</li>
          <li>Skills spend rank levels. Pause holds four mods. Q cycles spells when you hold a tome</li>
          <li>Caves run under the hills. Water spills. A repeater delays a signal. A ruined gate by the first hamlet opens the Nether</li>
          <li>Water and magma spread from a source. Look where a piston or repeater should point</li>
          <li>Hold to mine · place with the other click · E opens the bin</li>
        </ul>
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
        </span>
        <span>
          {Math.floor(hud.x)} {Math.floor(hud.y)} {Math.floor(hud.z)} · seed {hud.seedText || hud.seed}
        </span>
      </div>
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
            onClick={(e) => (e.shiftKey && item.id > 0 ? game.shiftStack(item.id) : game.setSlot(i))}
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

function PauseMenu({ game }: { game: GameApi }) {
  const s = game.settings;
  return (
    <div className="menu-wrap">
      <section className="card">
        <p className="eyebrow">Paused</p>
        <h1>
          Stud<span className="craft">craft</span>
        </h1>
        <div className="settings">
          <label>
            Look
            <input
              type="range"
              min={0.4}
              max={2.2}
              step={0.1}
              value={s.sens}
              onChange={(e) => game.setSens(Number(e.target.value))}
            />
          </label>
          <label>
            Horizon {s.radius}
            <input
              type="range"
              min={2}
              max={14}
              step={1}
              value={s.radius}
              onChange={(e) => game.setRadius(Number(e.target.value))}
            />
          </label>
          <label>
            Studs
            <input type="checkbox" checked={s.studs} onChange={(e) => game.setStuds(e.target.checked)} />
          </label>
          <label>
            Realistic
            <input type="checkbox" checked={s.realistic} onChange={(e) => game.setRealistic(e.target.checked)} />
          </label>
          <label>
            Sound
            <input type="checkbox" checked={s.sound} onChange={(e) => game.setSound(e.target.checked)} />
          </label>
          <label>
            Outside view
            <input type="checkbox" checked={s.third} onChange={(e) => game.setThird(e.target.checked)} />
          </label>
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
        <div className="stack">
          <button className="btn btn-primary" onClick={() => game.resume()}>
            Resume
          </button>
          <button className="btn" onClick={() => game.toggleInventory()}>
            Brick bin
          </button>
          <button className="btn" onClick={() => game.quit()}>
            Save and quit
          </button>
        </div>
        <p className="fine">
          Seed {game.hud.seedText || game.hud.seed}. The land does not end. Horizon is only the draw distance. Far bricks unload, and the same seed rebuilds them.
        </p>
        <button className="btn" onClick={() => game.copySeed()}>
          Copy seed
        </button>
      </section>
    </div>
  );
}

function Inventory({ game }: { game: GameApi }) {
  const hud = game.hud;
  const bench = hud.panel === "bench";
  const [page, setPage] = useState<"bin" | "ranks" | "quests" | "skills">("bin");
  const [book, setBook] = useState<"all" | "build" | "tools" | "magic" | "gear" | "food">("all");
  const known = new Set(hud.found);
  return (
    <div className="sheet-wrap">
      <section className="card sheet">
        <p className="eyebrow">
          {page === "quests" ? "Hamlet board" : page === "ranks" ? "Builder rank" : page === "skills" ? "Skill tree" : hud.panel === "bag" ? "Brick bin" : hud.panel}
        </p>
        <h1>
          {page === "ranks" ? hud.rank : page === "quests" ? "Quest board" : page === "skills" ? `${hud.skillPoints} points` : hud.panel === "trade" ? hud.trader || "Trader" : hud.panel === "furnace" ? "Kiln" : "Press & place"}
        </h1>
        <div className="rank-tabs">
          <button className={page === "bin" ? "btn on" : "btn"} onClick={() => setPage("bin")}>
            Bin
          </button>
          <button className={page === "ranks" ? "btn on" : "btn"} onClick={() => setPage("ranks")}>
            Ranks
          </button>
          <button className={page === "quests" ? "btn on" : "btn"} onClick={() => setPage("quests")}>
            Quests
          </button>
          <button className={page === "skills" ? "btn on" : "btn"} onClick={() => setPage("skills")}>
            Skills
          </button>
        </div>
        {page === "ranks" ? (
          <Ranks hud={hud} known={known} />
        ) : page === "quests" ? (
          <QuestList hud={hud} onClaim={(id) => game.claim(id)} />
        ) : page === "skills" ? (
          <SkillTree hud={hud} onUnlock={(id) => game.unlock(id)} />
        ) : (
          <>
        {hud.panel !== "trade" && (
          <div className="armor-row">
            {hud.armor.map((id, i) => (
              <button key={i} className="slot" onClick={() => game.armorTap(i)}>
                {id > 0 ? <ItemIcon id={id} /> : <small>{["Cap", "Shell", "Legs", "Boots"][i]}</small>}
              </button>
            ))}
          </div>
        )}
        {(hud.panel === "bag" || hud.panel === "bench") && (
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
        <p className="fine">Shift-click (PC), long-press or double-tap (mobile) moves a stack between the bar and the bin.</p>
          </>
        )}
        {hud.panel === "furnace" && (
          <div className="craft-grid">
            <button className="slot" onClick={() => game.furnaceTap(0)}>
              {hud.furnace.in ? <ItemIcon id={hud.furnace.in} /> : <small>Ore</small>}
              {hud.furnace.inN > 0 && <em>{hud.furnace.inN}</em>}
            </button>
            <button className="slot" onClick={() => game.furnaceTap(1)}>
              {hud.furnace.fuel ? <ItemIcon id={hud.furnace.fuel} /> : <small>Fuel</small>}
              {hud.furnace.fuelN > 0 && <em>{hud.furnace.fuelN}</em>}
            </button>
            <button className="slot out" onClick={() => game.furnaceTap(2)}>
              {hud.furnace.out ? <ItemIcon id={hud.furnace.out} /> : <small>Out</small>}
              {hud.furnace.outN > 0 && <em>{hud.furnace.outN}</em>}
            </button>
          </div>
        )}
        {hud.panel === "chest" && (
          <div className="grid-blocks chest">
            {hud.chest.map((cell, i) => (
              <button key={i} onClick={() => game.chestTap(i)}>
                {cell.id > 0 && <ItemIcon id={cell.id} />}
                {cell.n > 0 && <span>{cell.n}</span>}
              </button>
            ))}
          </div>
        )}
        {hud.panel === "enchant" && (
          <button className="btn btn-primary" onClick={() => game.enchant()}>
            Spend 3 levels — rune the blade
          </button>
        )}
        {hud.panel === "anvil" && (
          <div className="stack">
            <button className="btn btn-primary" onClick={() => game.mend()}>
              Spend 1 ingot — mend the held tool
            </button>
            <button className="btn" onClick={() => game.temper()}>
              Spend 1 level — temper the held tool
            </button>
          </div>
        )}
        {hud.panel === "brew" && (
          <div className="stack">
            <button className="btn" onClick={() => game.brew("heal")}>
              Bottle + apple → mend brew
            </button>
            <button className="btn" onClick={() => game.brew("speed")}>
              Bottle + wart → dash brew
            </button>
            <button className="btn" onClick={() => game.brew("might")}>
              Bottle + ember rod → might brew
            </button>
            <button className="btn" onClick={() => game.brew("focus")}>
              Bottle + amber → focus brew · level 6
            </button>
          </div>
        )}
        {hud.panel === "trade" && (
          <div className="stack">
            <p className="lede">{hud.traderBlurb}</p>
            {hud.offers.map((offer, i) => (
              <button key={i} className="btn" onClick={() => game.trade(i)}>
                {offer.pn} {offer.payName} → {offer.on} {offer.outName}
              </button>
            ))}
            {hud.trader === "Clerk" && <QuestList hud={hud} onClaim={(id) => game.claim(id)} />}
          </div>
        )}
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
        {(hud.panel === "bag" || hud.panel === "bench") && (
          <div className="recipes">
            <div className="rank-tabs book-tabs">
              {(["all", "build", "tools", "magic", "gear", "food"] as const).map((cat) => (
                <button key={cat} className={book === cat ? "btn on" : "btn"} onClick={() => setBook(cat)}>
                  {cat === "all" ? "All" : cat[0].toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            {RECIPES.filter((recipe) => book === "all" || recipe.cat === book).map((recipe) => (
              <button key={`${recipe.id}-${recipe.name}`} className="btn recipe" onClick={() => game.craft(recipe.id)}>
                <span className="recipe-io">
                  {recipe.need.map(([rid, n]) => (
                    <span key={rid} className="recipe-bit">
                      <ItemIcon id={rid} />
                      {n > 1 ? <em>{n}</em> : null}
                    </span>
                  ))}
                  <span className="recipe-arrow" aria-hidden="true">
                    →
                  </span>
                  <ItemIcon id={recipe.out > 0 ? recipe.out : ID.AxeW} />
                </span>
                <span className="recipe-name">
                  {recipe.name}
                  <small>{recipe.detail}</small>
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="lede" style={{ marginTop: 12 }}>
          Shift-click a brick to move it between the bar and the bag. Color press spends one spare brick. Cursor: {hud.cursor ? def(hud.cursor).name : "empty"}.
        </p>
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
        <button className="btn btn-primary" onClick={() => game.toggleInventory()}>
          Close
        </button>
          </>
        )}
        {page === "ranks" && (
          <button className="btn btn-primary" onClick={() => game.toggleInventory()}>
            Close
          </button>
        )}
        {page === "quests" && (
          <button className="btn btn-primary" onClick={() => game.toggleInventory()}>
            Close
          </button>
        )}
        {page === "skills" && (
          <button className="btn btn-primary" onClick={() => game.toggleInventory()}>
            Close
          </button>
        )}
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
        {hud.xp} / {hud.xpNeed} studs. Rune table spends 3 levels. Anvil tempers a held tool for 1 level. Tin and copper hide in mid stone. Amber, chrome, and sapphire sit deeper.
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
