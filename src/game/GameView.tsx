import { useEffect, useRef, useState } from "react";
import { Drumstick, Droplets, Heart } from "lucide-react";
import { BLOCKS, CATALOG, COLORS, ID, def } from "./blocks";
import type { EnterKind, GameApi, Phase } from "./game";
import { RECIPES } from "./recipes";
import { CODEX, PERKS } from "./ranks";

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pending = useRef<EnterKind | null>(null);
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
          mounted.enter(pending.current);
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

  function start(kind: EnterKind) {
    if (api) api.enter(kind);
    else pending.current = kind;
  }

  return (
    <div className="game-root" role="application" aria-label="Studcraft">
      <canvas ref={canvasRef} className="world" />
      {api ? (
        <Overlay game={api} />
      ) : (
        <TitleScreen onEnter={start} hasSave={false} booting error={error} />
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
        <TitleScreen onEnter={game.enter} hasSave={game.hasSave} booting={false} error={null} />
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
  onEnter,
  hasSave,
  booting,
  error,
}: {
  onEnter: (kind: EnterKind) => void;
  hasSave: boolean;
  booting: boolean;
  error: string | null;
}) {
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
          Mine a world made of snap-together bricks. Break what you need, press new colors, and build on the studs.
        </p>
        {error && <p className="lede">{error}</p>}
        <div className="stack">
          <button className="btn btn-primary" onClick={() => onEnter("play")}>
            Play
          </button>
          <button className="btn" onClick={() => onEnter("survival")}>
            Survival
          </button>
          <button className="btn" onClick={() => onEnter("flat")}>
            Baseplate
          </button>
          {hasSave && (
            <button className="btn" onClick={() => onEnter("continue")}>
              Continue
            </button>
          )}
        </div>
        <ul className="hints">
          <li>WASD move · Space jump · double-tap Space flies in creative</li>
          <li>Survival ranks up: rare studs, alloys, and an anvil that tempers tools</li>
          <li>Hamlets have traders. Quests live in the bin, and the clerk posts the same board</li>
          <li>Hold to mine · place with the other click · E opens the bin</li>
          <li>Shift sneaks · Ctrl sprints · F5 steps outside your minifig</li>
        </ul>
        <p className="fine">
          {booting ? "Stacking the first bricks…" : "An original brick sandbox. Not a toy brand, not a block game."}
        </p>
      </section>
    </div>
  );
}

function Hud({ game }: { game: GameApi }) {
  const hud = game.hud;
  const hearts = 10;
  return (
    <div className="hud">
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
        </span>
        <span>
          {Math.floor(hud.x)} {Math.floor(hud.y)} {Math.floor(hud.z)} · seed {hud.seed}
        </span>
      </div>
      {!hud.locked && !hud.message && <p className="look-hint">Drag to look · click to capture the mouse</p>}
      {hud.message && <p className="toast">{hud.message}</p>}
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
          {Array.from({ length: hearts }, (_, i) => (
            <Heart
              key={i}
              size={16}
              className={i < Math.ceil(hud.health / 2) ? "heart" : "heart off"}
              fill="currentColor"
            />
          ))}
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
      <div className="hotbar">
        {hud.hotbar.map((item, i) => (
          <button key={i} className={i === hud.slot ? "slot on" : "slot"} onClick={() => game.setSlot(i)}>
            <small>{i + 1}</small>
            {item.id > 0 && <Brick color={def(item.id).color} />}
            {item.id > 0 && item.count >= 0 && <em>{item.count}</em>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Brick({ color }: { color: string }) {
  return (
    <span className="brick-icon" style={{ background: color }}>
      <i />
      <i />
      <i />
      <i />
    </span>
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
            Horizon
            <input
              type="range"
              min={2}
              max={5}
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
            Sound
            <input type="checkbox" checked={s.sound} onChange={(e) => game.setSound(e.target.checked)} />
          </label>
          <label>
            Outside view
            <input type="checkbox" checked={s.third} onChange={(e) => game.setThird(e.target.checked)} />
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
        <p className="fine">Seed {game.hud.seed}. Worlds stay in this browser.</p>
      </section>
    </div>
  );
}

function Inventory({ game }: { game: GameApi }) {
  const hud = game.hud;
  const bench = hud.panel === "bench";
  const [page, setPage] = useState<"bin" | "ranks" | "quests">("bin");
  const known = new Set(hud.found);
  return (
    <div className="sheet-wrap">
      <section className="card sheet">
        <p className="eyebrow">
          {page === "quests" ? "Hamlet board" : page === "ranks" ? "Builder rank" : hud.panel === "bag" ? "Brick bin" : hud.panel}
        </p>
        <h1>
          {page === "ranks" ? hud.rank : page === "quests" ? "Quest board" : hud.panel === "trade" ? hud.trader || "Trader" : hud.panel === "furnace" ? "Kiln" : "Press & place"}
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
        </div>
        {page === "ranks" ? (
          <Ranks hud={hud} known={known} />
        ) : page === "quests" ? (
          <QuestList hud={hud} onClaim={(id) => game.claim(id)} />
        ) : (
          <>
        {hud.panel !== "trade" && (
          <div className="armor-row">
            {hud.armor.map((id, i) => (
              <button key={i} className="slot" onClick={() => game.armorTap(i)}>
                {id > 0 ? <Brick color={def(id).color} /> : <small>{["Cap", "Shell", "Legs", "Boots"][i]}</small>}
              </button>
            ))}
          </div>
        )}
        {(hud.panel === "bag" || hud.panel === "bench") && (
          <>
            <div className="craft-grid">
              {hud.grid.map((id, i) => (
                <button key={i} className="slot" onClick={() => game.gridTap(i)} disabled={!bench && i % 3 === 2}>
                  {id > 0 && <Brick color={def(id).color} />}
                </button>
              ))}
              <button className="slot out" onClick={() => game.craftTake()}>
                {hud.craftOut ? <Brick color={def(hud.craftOut.id).color} /> : <small>Out</small>}
                {hud.craftOut && hud.craftOut.n > 1 ? <em>{hud.craftOut.n}</em> : null}
              </button>
            </div>
            <p className="fine">Tap a brick below, then a grid cell. The 2×2 works in the bag. Bench uses all nine.</p>
          </>
        )}
        {hud.panel === "furnace" && (
          <div className="craft-grid">
            <button className="slot" onClick={() => game.furnaceTap(0)}>
              {hud.furnace.in ? <Brick color={def(hud.furnace.in).color} /> : <small>Ore</small>}
              {hud.furnace.inN > 0 && <em>{hud.furnace.inN}</em>}
            </button>
            <button className="slot" onClick={() => game.furnaceTap(1)}>
              {hud.furnace.fuel ? <Brick color={def(hud.furnace.fuel).color} /> : <small>Fuel</small>}
              {hud.furnace.fuelN > 0 && <em>{hud.furnace.fuelN}</em>}
            </button>
            <button className="slot out" onClick={() => game.furnaceTap(2)}>
              {hud.furnace.out ? <Brick color={def(hud.furnace.out).color} /> : <small>Out</small>}
              {hud.furnace.outN > 0 && <em>{hud.furnace.outN}</em>}
            </button>
          </div>
        )}
        {hud.panel === "chest" && (
          <div className="grid-blocks chest">
            {hud.chest.map((cell, i) => (
              <button key={i} onClick={() => game.chestTap(i)}>
                {cell.id > 0 && <Brick color={def(cell.id).color} />}
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
                onClick={() => {
                  game.hold(id);
                  game.assign(id);
                }}
              >
                <Brick color={def(id).color} />
                {def(id).name}
                <span>{hud.creative ? "all" : count}</span>
              </button>
            );
          })}
        </div>
        {(hud.panel === "bag" || hud.panel === "bench") && (
          <div className="recipes">
            {RECIPES.map((recipe) => (
              <button key={recipe.id} className="btn" onClick={() => game.craft(recipe.id)}>
                {recipe.name} — {recipe.detail}
              </button>
            ))}
          </div>
        )}
        <p className="lede" style={{ marginTop: 12 }}>
          Color press spends one spare brick. Cursor: {hud.cursor ? def(hud.cursor).name : "empty"}.
        </p>
        <div className="colors">
          {COLORS.map((id) => (
            <button key={id} style={{ background: def(id).color }} aria-label={def(id).name} onClick={() => game.press(id)} />
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
              <Brick color={seen ? def(entry.id).color : "var(--color-line)"} />
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
          const max = 40;
          const m = Math.hypot(dx, dy) || 1;
          const scale = Math.min(1, max / m);
          setKnob({ x: 40 + dx * scale, y: 40 + dy * scale });
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
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {label}
    </button>
  );
}
