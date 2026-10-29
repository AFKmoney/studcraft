import type { ReactNode } from "react";
import { ID, TECHNIC, def, type BlockDef } from "./blocks";
import { CUBE_ICONS } from "./cubeIcons";

// IDs that have bespoke multi-part 3D LEGO set-piece illustrations (workstations,
// mechanisms, lighting, storage, special blocks) so they never fall back to an old
// plain single-color cube PNG.
const BESPOKE_LEGO_SET_IDS = new Set<number>([
  ID.Bench,
  ID.Furnace,
  ID.Chest,
  ID.Barrel,
  ID.ShulkerBox,
  ID.Anvil,
  ID.Grindstone,
  ID.Enchanter,
  ID.Brew,
  ID.Campfire,
  ID.Bed,
  ID.TNT,
  ID.Bookshelf,
  ID.Jukebox,
  ID.Note,
  ID.Dispenser,
  ID.Hopper,
  ID.Beacon,
  ID.Conduit,
  ID.Spawner,
  ID.EndFrame,
  ID.EndFrameEye,
  ID.EndCrystal,
  ID.DragonEgg,
  ID.Torch,
  ID.RedTorch,
  ID.RedTorchOn,
  ID.Lantern,
  ID.Door,
  ID.Gate,
  ID.Fence,
  ID.Ladder,
  ID.Rail,
  ID.Lever,
  ID.Plate,
  ID.Repeater,
  ID.Comparator,
  ID.Observer,
  ID.Piston,
  ID.Daylight,
  ID.Target,
  ID.Banner,
  ID.Sign,
  ID.Frame,
  ID.Painting,
  ID.Pumpkin,
  ID.Melon,
  ID.Hay,
  ID.Cactus,
]);

const TECHNIC_IDS = new Set<number>(TECHNIC);

function shadeHex(hex: string, amt: number): string {
  const clean = hex.startsWith("#") ? hex.slice(1) : "8e959c";
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full, 16) || 0x8e959c;
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// Reusable 3D cylindrical LEGO stud in isometric projection
function IsoStud({ cx, cy, fill, r = 2.6, h = 1.8 }: { cx: number; cy: number; fill: string; r?: number; h?: number }) {
  const dark = shadeHex(fill, -36);
  const top = shadeHex(fill, 22);
  return (
    <g>
      <ellipse cx={cx} cy={cy + 0.5} rx={r * 1.08} ry={r * 0.55} fill="rgba(0,0,0,0.28)" />
      <path
        d={`M${cx - r} ${cy - h}v${h}a${r} ${r * 0.52} 0 0 0 ${r * 2} 0v-${h}z`}
        fill={dark}
      />
      <ellipse cx={cx} cy={cy - h} rx={r} ry={r * 0.52} fill={top} stroke="rgba(255,255,255,0.35)" strokeWidth="0.45" />
    </g>
  );
}

// Reusable 3D Isometric LEGO 2x2 Brick Base with 4 top studs & modular sub-brick seams
function IsoBrick({
  topFill,
  leftFill,
  rightFill,
  studFill,
  seams = true,
  studs = true,
}: {
  topFill: string;
  leftFill: string;
  rightFill: string;
  studFill?: string;
  seams?: boolean;
  studs?: boolean;
}) {
  const sCol = studFill || topFill;
  return (
    <g>
      {/* Top 2x2 diamond face */}
      <polygon points="16,5 28,11 16,17 4,11" fill={topFill} />
      {/* Left face */}
      <polygon points="4,11 16,17 16,29 4,23" fill={leftFill} />
      {/* Right face */}
      <polygon points="16,17 28,11 28,23 16,29" fill={rightFill} />
      {/* Modular 3-course LEGO horizontal & running-bond seams */}
      {seams && (
        <g stroke="rgba(0,0,0,0.28)" strokeWidth="0.7" fill="none">
          <line x1="4" y1="14.5" x2="16" y2="20.5" />
          <line x1="16" y1="20.5" x2="28" y2="14.5" />
          <line x1="4" y1="18.8" x2="16" y2="24.8" />
          <line x1="16" y1="24.8" x2="28" y2="18.8" />
          <line x1="10" y1="17.5" x2="10" y2="21.8" />
          <line x1="22" y1="17.5" x2="22" y2="21.8" />
        </g>
      )}
      {/* Specular bevel highlights */}
      <polyline points="4,11 16,17 28,11" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
      <line x1="16" y1="17" x2="16" y2="29" stroke="rgba(0,0,0,0.22)" strokeWidth="0.75" />
      {/* 4 cylindrical LEGO studs on top */}
      {studs && (
        <g>
          <IsoStud cx={16} cy={8.2} fill={sCol} r={2.3} h={1.6} />
          <IsoStud cx={10.5} cy={11} fill={sCol} r={2.3} h={1.6} />
          <IsoStud cx={21.5} cy={11} fill={sCol} r={2.3} h={1.6} />
          <IsoStud cx={16} cy={13.8} fill={sCol} r={2.3} h={1.6} />
        </g>
      )}
    </g>
  );
}

export function ItemIcon({ id, muted = false }: { id: number; muted?: boolean }) {
  if (id <= 0) return null;
  const block = def(id);
  const img = CUBE_ICONS[id];
  if (img && !muted && !BESPOKE_LEGO_SET_IDS.has(id)) {
    return (
      <img
        className="item-icon"
        src={img}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 4 }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  const fill = muted ? "#6b6256" : block.color;
  return (
    <svg className="item-icon" viewBox="0 0 32 32" aria-hidden="true">
      {glyph(block, fill, muted)}
    </svg>
  );
}

function glyph(block: BlockDef, fill: string, muted = false): ReactNode {
  const id = block.id;
  // 1. Bespoke LEGO Workstations & Functional Blocks
  if (id === ID.Furnace || block.work === "furnace") return <LegoFurnace muted={muted} />;
  if (id === ID.Bench || block.work === "bench") return <LegoWorkbench muted={muted} />;
  if (id === ID.Chest || id === ID.ShulkerBox || (block.work === "chest" && id !== ID.Barrel)) {
    return <LegoChest fill={fill} isShulker={id === ID.ShulkerBox} muted={muted} />;
  }
  if (id === ID.Barrel) return <LegoBarrel muted={muted} />;
  if (id === ID.Anvil || id === ID.Grindstone || block.work === "anvil") {
    return <LegoAnvil isGrind={id === ID.Grindstone} muted={muted} />;
  }
  if (id === ID.Enchanter || block.work === "enchant") return <LegoEnchanter muted={muted} />;
  if (id === ID.Brew || block.work === "brew") return <LegoBrewStand muted={muted} />;
  if (id === ID.Campfire) return <LegoCampfire muted={muted} />;
  if (id === ID.Bed || block.work === "bed") return <LegoBed fill={fill} />;
  if (id === ID.TNT) return <LegoTNT />;
  if (id === ID.Bookshelf) return <LegoBookshelf />;
  if (id === ID.Jukebox || id === ID.Note) return <LegoJukebox isJuke={id === ID.Jukebox} />;
  if (id === ID.Dispenser || id === ID.Observer || id === ID.ObserverOn) return <LegoDispenser isObserver={id !== ID.Dispenser} />;
  if (id === ID.Hopper) return <LegoHopper />;
  if (id === ID.Beacon || id === ID.Conduit) return <LegoBeacon isConduit={id === ID.Conduit} />;
  if (id === ID.Spawner) return <LegoSpawner />;
  if (id === ID.EndFrame || id === ID.EndFrameEye) return <LegoEndFrame hasEye={id === ID.EndFrameEye} />;
  if (id === ID.EndCrystal) return <LegoEndCrystal />;
  if (id === ID.DragonEgg) return <LegoDragonEgg />;
  if (id === ID.Pumpkin || id === ID.Melon || id === ID.Hay || id === ID.Target) return <LegoSpecialBlock id={id} fill={fill} />;
  if (id === ID.Piston) return <LegoPiston />;
  if (id === ID.Daylight || id === ID.DaylightInv) return <LegoDaylight inv={id === ID.DaylightInv} />;

  // 2. LEGO Tools & Weapons (with cylindrical Minifig handles, Technic collars & studded blades)
  if (block.tool === "pick") return <LegoPick fill={fill} />;
  if (block.tool === "axe") return <LegoAxe fill={fill} />;
  if (block.tool === "shovel") return <LegoShovel fill={fill} />;
  if (id === ID.Trident || id === ID.TidalBlade) return <LegoTrident fill={fill} />;
  if (block.tool === "sword") return <LegoSword fill={fill} />;
  if (block.tool === "hoe") return <LegoHoe fill={fill} />;
  if (id === ID.Crossbow) return <LegoCrossbow />;
  if (block.tool === "bow" || id === ID.AntlerBow) return <LegoBow fill={fill} />;
  if (id === ID.Shield) return <LegoShield fill={fill} />;
  if (id === ID.Rod) return <LegoFishingRod />;
  if (id === ID.Shears) return <LegoShears />;
  if (id === ID.Flint) return <LegoFlintSteel />;

  // 3. LEGO Minifig Armor & Wearables
  if (block.armorSlot === 1) return <LegoHelmet fill={fill} />;
  if (block.armorSlot === 2) return <LegoChestplate fill={fill} />;
  if (block.armorSlot === 3) return <LegoLeggings fill={fill} />;
  if (block.armorSlot === 4) return <LegoBoots fill={fill} />;
  if (id === ID.Elytra) return <LegoElytra fill={fill} />;

  // 4. LEGO Torches, Lanterns, Doors, Fences, Rails & Redstone
  if (id === ID.Lantern) return <LegoLantern />;
  if (block.torch) return <LegoTorch isRed={id === ID.RedTorch || id === ID.RedTorchOn} />;
  if (block.door || block.gate) return <LegoDoor fill={fill} isGate={block.gate} />;
  if (id === ID.Fence) return <LegoFence fill={fill} />;
  if (block.ladder) return <LegoLadder fill={fill} />;
  if (block.rail) return <LegoRail />;
  if (block.lever) return <LegoLever />;
  if (block.plate || id === ID.Repeater || id === ID.Comparator) return <LegoRedstonePlate id={id} fill={fill} />;
  if (block.dust) return <LegoRedstoneDust fill={fill} />;

  // 5. LEGO Potions, Bottles & Buckets
  if (
    id === ID.Bottle ||
    id === ID.BaseBrew ||
    id === ID.Focus ||
    id === ID.Honey ||
    id === ID.WitchVenom ||
    block.name.includes("brew") ||
    block.name.includes("splash")
  ) {
    return <LegoPotion fill={fill} splash={block.name.includes("splash")} empty={id === ID.Bottle} />;
  }
  if (id === ID.Bucket || id === ID.WaterBucket || id === ID.LavaBucket || id === ID.Milk) {
    return <LegoBucket id={id} fill={fill} />;
  }

  // 6. LEGO Food & Crops
  if (block.food > 0 || id === ID.Wheat || id === ID.Seeds || id === ID.Pie) {
    return <LegoFood block={block} fill={fill} />;
  }
  if (id === ID.Cactus) return <LegoCactus />;
  if (block.plant || block.crop || block.sapling || block.cane) {
    return <LegoPlant block={block} fill={fill} />;
  }

  // 7. LEGO Vehicles, Books, Gadgets, Ingots, Gems & Misc Items
  if (id === ID.Boat) return <LegoBoat fill={fill} />;
  if (id === ID.Cart) return <LegoMinecart />;
  if (id === ID.Saddle) return <LegoSaddle />;
  if (id === ID.Arrow) return <LegoArrow />;
  if (id === ID.Firework) return <LegoFirework />;
  if (id === ID.Stick || id === ID.Blaze || id === ID.Bone) return <LegoRodPiece id={id} fill={fill} />;
  if (id === ID.Compass || id === ID.Clock) return <LegoDialTile isClock={id === ID.Clock} fill={fill} />;
  if (id === ID.Map || id === ID.Paper || id === ID.NameTag) return <LegoPrintedTile id={id} fill={fill} />;
  if (id === ID.Book || id === ID.EnchBook || id === ID.Tome) return <LegoBook fill={fill} enchanted={id !== ID.Book} />;
  if (id === ID.Banner || id === ID.Sign || id === ID.Frame || id === ID.Painting) return <LegoSignBanner id={id} fill={fill} />;
  if (id === ID.Horn) return <LegoHorn fill={fill} />;
  if (id === ID.Lead || id === ID.String) return <LegoCord fill={fill} />;
  if (id === ID.Feather) return <LegoFeather />;
  if (id === ID.Totem) return <LegoTotem />;
  if (id === ID.NetherStar) return <LegoNetherStar />;
  if (id === ID.WitherSkull) return <LegoSkull />;
  if (id === ID.EnderPearl || id === ID.Eye || id === ID.Slime || id === ID.VoidCore) return <LegoOrb id={id} fill={fill} />;
  if (id >= ID.DiscA && id <= ID.DiscE) return <LegoDisc fill={fill} />;
  if (
    id === ID.Ingot ||
    id === ID.RawIron ||
    id === ID.Copper ||
    id === ID.Tin ||
    id === ID.Bronze ||
    id === ID.Chrome ||
    id === ID.Scrap ||
    id === ID.GravelBar ||
    id === ID.PharaohGold ||
    id === ID.IllagerBadge
  ) {
    return <LegoIngotTile fill={fill} />;
  }
  if (
    id === ID.Diamond ||
    id === ID.Emerald ||
    id === ID.Coal ||
    id === ID.Amber ||
    id === ID.Sapphire ||
    id === ID.Resin ||
    id === ID.Prism ||
    id === ID.Crystal ||
    id === ID.GuardianSpike ||
    block.need >= 2
  ) {
    return <LegoCrystalGem fill={fill} />;
  }

  // Technic pieces: specialized SVG instead of generic brick
  if (TECHNIC_IDS.has(id)) return <LegoTechnic id={id} fill={fill} />;

  // Fallback: 3D Isometric LEGO 2x2 Brick with 4 real cylindrical studs
  return (
    <IsoBrick
      topFill={shadeHex(fill, 18)}
      leftFill={fill}
      rightFill={shadeHex(fill, -26)}
      studFill={shadeHex(fill, 14)}
    />
  );
}

function LegoTechnic({ id, fill }: { id: number; fill: string }) {
  const dark = shadeHex(fill, -40);
  const light = shadeHex(fill, 30);
  // Gears
  if (id === ID.Gear8 || id === ID.Gear16 || id === ID.Gear24 || id === ID.Gear40 || id === ID.Bevel12 || id === ID.Bevel20 || id === ID.DBevel12 || id === ID.DBevel20 || id === ID.DBevel36 || id === ID.Slip) {
    const teeth = id === ID.Gear8 || id === ID.Bevel12 ? 8 : id === ID.Gear16 ? 12 : id === ID.Gear24 || id === ID.DBevel36 ? 16 : 10;
    const r = 8;
    const teethPaths = [];
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const x = 16 + Math.cos(a) * (r + 2);
      const y = 16 + Math.sin(a) * (r + 2);
      teethPaths.push(<rect key={i} x={x - 1.2} y={y - 1.2} width={2.4} height={2.4} fill={light} transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} />);
    }
    return (
      <g>
        <circle cx="16" cy="16" r={r} fill={fill} />
        <circle cx="16" cy="16" r={r * 0.55} fill={dark} />
        <circle cx="16" cy="16" r={2.2} fill={light} />
        {teethPaths}
      </g>
    );
  }
  // Axles and pins
  if (id === ID.Axle || id === ID.Worm || id === ID.AxleStop3 || id === ID.AxleStop5 || id === ID.AxlePin || id === ID.Pin2L || id === ID.PinFree || id === ID.Pin3L || id === ID.Pin3LFree || id === ID.Towball) {
    return (
      <g>
        <rect x="14" y="4" width="4" height="24" rx="1" fill={fill} />
        <rect x="12" y="4" width="8" height="3" fill={dark} />
        <rect x="12" y="25" width="8" height="3" fill={dark} />
        {id === ID.Towball && <circle cx="16" cy="6" r="3.5" fill={light} />}
      </g>
    );
  }
  // Liftarms and frames
  if (id === ID.Liftarm3 || id === ID.Liftarm5 || id === ID.Liftarm7 || id === ID.Liftarm9 || id === ID.Liftarm11 || id === ID.Liftarm13 || id === ID.Liftarm15 || id === ID.Thin3 || id === ID.Thin5 || id === ID.Thin7 || id === ID.BentL || id === ID.BentT || id === ID.Frame57 || id === ID.Frame711 || id === ID.Frame1115) {
    const holes = id === ID.Liftarm3 || id === ID.Thin3 ? 3 : id === ID.Liftarm5 || id === ID.Thin5 ? 5 : 4;
    const holeEls = [];
    for (let i = 0; i < holes; i++) {
      const y = 8 + i * 4;
      holeEls.push(<circle key={i} cx="16" cy={y} r="1.6" fill={dark} />);
    }
    return (
      <g>
        <rect x="10" y="6" width="12" height="20" rx="1.5" fill={fill} />
        {holeEls}
      </g>
    );
  }
  // Motors and hub
  if (id === ID.MotorM || id === ID.MotorL || id === ID.MotorXL || id === ID.Servo || id === ID.TechHub || id === ID.Battery || id === ID.Remote) {
    return (
      <g>
        <rect x="6" y="8" width="20" height="14" rx="2" fill={fill} />
        <rect x="22" y="12" width="6" height="6" fill={dark} />
        <circle cx="25" cy="15" r="1.8" fill={light} />
        {id === ID.TechHub && <><rect x="9" y="11" width="3" height="3" fill={light} /><rect x="14" y="11" width="3" height="3" fill={light} /><rect x="19" y="11" width="3" height="3" fill={light} /></>}
      </g>
    );
  }
  // Pumps, pipes, actuators
  if (id === ID.Pump || id === ID.SpringPump || id === ID.SmallPump || id === ID.Pipe || id === ID.PipeElbow || id === ID.Actuator || id === ID.ActMini || id === ID.ActXL || id === ID.Cylinder || id === ID.Valve || id === ID.Tank) {
    return (
      <g>
        <rect x="12" y="4" width="8" height="24" rx="2" fill={fill} />
        <rect x="10" y="6" width="12" height="4" fill={dark} />
        <rect x="10" y="22" width="12" height="4" fill={dark} />
        {id === ID.SpringPump && <><rect x="11" y="12" width="10" height="2" fill={light} /><rect x="11" y="16" width="10" height="2" fill={light} /></>}
      </g>
    );
  }
  // Default technic: small gear-like
  return (
    <g>
      <circle cx="16" cy="16" r="7" fill={fill} />
      <circle cx="16" cy="16" r="3" fill={dark} />
    </g>
  );
}

// ─── BESPOKE 3D ISOMETRIC LEGO WORKSTATIONS ──────────────────────────────

function LegoFurnace({ muted }: { muted?: boolean }) {
  const top = muted ? "#78726a" : "#8c847c";
  const left = muted ? "#625c56" : "#6e665e";
  const right = muted ? "#4c4642" : "#544d47";
  return (
    <g>
      <IsoBrick topFill={top} leftFill={left} rightFill={right} studFill={top} />
      {/* Chimney vent on top center */}
      <ellipse cx="16" cy="11" rx="3.2" ry="1.6" fill="#221e1b" />
      <ellipse cx="16" cy="11" rx="1.6" ry="0.8" fill="#ff6a18" />
      {/* Arched LEGO kiln hearth on right-front face */}
      <polygon points="18,19.5 26,15.5 26,23.5 18,27.5" fill="#18120e" stroke="#38312c" strokeWidth="0.8" />
      {/* Glowing LEGO Coal 1x1 studs */}
      <circle cx="20" cy="25" r="1.2" fill="#ff4810" />
      <circle cx="22.2" cy="24" r="1.2" fill="#ff7818" />
      <circle cx="24.2" cy="23" r="1.2" fill="#ff4810" />
      {/* Molded Trans-Orange & Trans-Yellow LEGO Flame piece inside furnace */}
      <path
        d="M19.2 25.2 C19 21.5 20.5 19.5 21.2 18.2 C21.8 19.8 22.5 17.2 23.2 16.5 C23.8 18.5 25 19.2 24.8 22.5 Z"
        fill="#ff6210"
      />
      <path
        d="M20.3 24.8 C20.5 22.2 21.5 20.5 22.2 19.2 C22.8 20.2 23.5 21.2 23.6 23.2 Z"
        fill="#ffe042"
      />
      {/* Upper stone vent grille on left face */}
      <line x1="6.5" y1="14.5" x2="13.5" y2="18" stroke="#26201c" strokeWidth="1.3" />
    </g>
  );
}

function LegoWorkbench({ muted }: { muted?: boolean }) {
  const top = muted ? "#9a8262" : "#e8b960";
  const left = muted ? "#7a6448" : "#c89242";
  const right = muted ? "#624e36" : "#a4722c";
  return (
    <g>
      <IsoBrick topFill={top} leftFill={left} rightFill={right} studs={false} />
      {/* Dark brown LEGO corner timber pillars */}
      <polygon points="4,11 6.5,12.2 6.5,24.2 4,23" fill="#5c341a" />
      <polygon points="13.5,15.8 16,17 16,29 13.5,27.8" fill="#5c341a" />
      <polygon points="25.5,12.2 28,11 28,23 25.5,24.2" fill="#462612" />
      {/* 3x3 LEGO Crafting Grid with 9 miniature studs on top */}
      <polygon points="16,6.3 25.4,11 16,15.7 6.6,11" fill="#6b3e22" />
      {[
        [16, 8.0],
        [12.8, 9.6],
        [19.2, 9.6],
        [9.6, 11.1],
        [16, 11.1],
        [22.4, 11.1],
        [12.8, 12.6],
        [19.2, 12.6],
        [16, 14.1],
      ].map(([cx, cy], i) => (
        <IsoStud key={i} cx={cx} cy={cy} fill={i % 2 === 0 ? "#d99e4c" : "#b87e34"} r={1.35} h={0.95} />
      ))}
      {/* Hanging miniature LEGO Hammer on left face */}
      <rect x="8.2" y="16.5" width="4.2" height="1.8" rx="0.4" transform="skewY(26)" fill="#d9dde2" />
      <rect x="9.8" y="17.5" width="1.1" height="5.5" transform="skewY(26)" fill="#5c341a" />
      {/* Hanging miniature LEGO Saw on right face */}
      <polygon points="20,18 24,16 23,22 20,23.5" fill="#d9dde2" />
      <polygon points="20,17 23.2,15.4 23.2,17.2 20,18.8" fill="#d43228" />
    </g>
  );
}

function LegoChest({ fill, isShulker, muted }: { fill: string; isShulker?: boolean; muted?: boolean }) {
  const base = muted ? "#7a6854" : isShulker ? "#8a6aa8" : "#c89044";
  const top = shadeHex(base, 20);
  const left = base;
  const right = shadeHex(base, -24);
  const trim = isShulker ? "#4a3264" : "#5c3818";
  return (
    <g>
      <IsoBrick topFill={top} leftFill={left} rightFill={right} studFill={top} />
      {/* Hinged lid seam */}
      <polyline points="4,15.2 16,21.2 28,15.2" fill="none" stroke="#1a1008" strokeWidth="1.3" />
      {/* Dark corner straps */}
      <line x1="5" y1="11.5" x2="5" y2="23.2" stroke={trim} strokeWidth="1.4" />
      <line x1="16" y1="17" x2="16" y2="29" stroke={trim} strokeWidth="1.6" />
      <line x1="27" y1="11.5" x2="27" y2="23.2" stroke={trim} strokeWidth="1.4" />
      {/* Metallic Gold 1x1 LEGO Latch Plate with stud on right-front */}
      <polygon points="20.5,17.2 23.8,15.6 23.8,19.8 20.5,21.4" fill="#ffd84a" stroke="#9e6e10" strokeWidth="0.6" />
      <circle cx="22.1" cy="18.6" r="0.9" fill="#b88418" />
    </g>
  );
}

function LegoBarrel({ muted }: { muted?: boolean }) {
  const base = muted ? "#6e5c4a" : "#8d5a34";
  return (
    <g>
      <IsoBrick topFill={shadeHex(base, 22)} leftFill={base} rightFill={shadeHex(base, -22)} />
      {/* Iron barrel hoops */}
      <polyline points="4,14.2 16,20.2 28,14.2" fill="none" stroke="#3e4248" strokeWidth="1.8" />
      <polyline points="4,20.2 16,26.2 28,20.2" fill="none" stroke="#3e4248" strokeWidth="1.8" />
      <circle cx="16" cy="11" r="1.5" fill="#2a1c12" />
    </g>
  );
}

function LegoAnvil({ isGrind, muted }: { isGrind?: boolean; muted?: boolean }) {
  const c1 = muted ? "#7a7e82" : isGrind ? "#a7aeb4" : "#8e959c";
  const c2 = shadeHex(c1, -26);
  const c3 = shadeHex(c1, 24);
  return (
    <g>
      {/* Stepped LEGO Anvil baseplate */}
      <polygon points="6,23 16,28 26,23 16,18" fill={c1} />
      <polygon points="6,23 16,28 16,30 6,25" fill={c2} />
      <polygon points="16,28 26,23 26,25 16,30" fill={shadeHex(c1, -42)} />
      {/* Narrow neck column */}
      <polygon points="11,15 21,15 21,23 11,23" fill={c2} />
      {/* Heavy overhanging horned LEGO anvil top with studs */}
      <polygon points="16,6 28,12 16,18 4,12" fill={c3} />
      <polygon points="4,12 16,18 16,22 4,16" fill={c1} />
      <polygon points="16,18 28,12 28,16 16,22" fill={c2} />
      <IsoStud cx={13} cy={11.2} fill={c3} r={2.2} h={1.5} />
      <IsoStud cx={19} cy={11.2} fill={c3} r={2.2} h={1.5} />
    </g>
  );
}

function LegoEnchanter({ muted }: { muted?: boolean }) {
  return (
    <g>
      <IsoBrick
        topFill={muted ? "#583848" : "#c42828"}
        leftFill={muted ? "#342842" : "#2a1848"}
        rightFill={muted ? "#241a30" : "#1a1030"}
        studs={false}
      />
      {/* Red velvet draped side cloth & gold trim */}
      <polygon points="6,12 14,16 10,22" fill="#d43228" stroke="#ffd84a" strokeWidth="0.6" />
      <polygon points="18,16 26,12 22,22" fill="#b02220" stroke="#ffd84a" strokeWidth="0.6" />
      {/* 4 Glowing Cyan Aqua-Gem corner studs */}
      <IsoStud cx={16} cy={6.8} fill="#5ef2f2" r={1.8} h={1.4} />
      <IsoStud cx={7.2} cy={11} fill="#5ef2f2" r={1.8} h={1.4} />
      <IsoStud cx={24.8} cy={11} fill="#5ef2f2" r={1.8} h={1.4} />
      <IsoStud cx={16} cy={15.2} fill="#5ef2f2" r={1.8} h={1.4} />
      {/* Open hinged LEGO Spellbook on top */}
      <polygon points="11,9.5 16,11.5 16,7.5 11,5.5" fill="#f4f1ea" stroke="#8d3e18" strokeWidth="0.8" />
      <polygon points="16,11.5 21,9.5 21,5.5 16,7.5" fill="#e7e2d8" stroke="#8d3e18" strokeWidth="0.8" />
    </g>
  );
}

function LegoBrewStand({ muted }: { muted?: boolean }) {
  return (
    <g>
      {/* Cobblestone 2x2 LEGO base plate */}
      <polygon points="16,18 28,24 16,30 4,24" fill="#9aa1a8" />
      <polygon points="4,24 16,30 16,31.5 4,25.5" fill="#7e868e" />
      <polygon points="16,30 28,24 28,25.5 16,31.5" fill="#5c646c" />
      <IsoStud cx={10.5} cy={24} fill="#9aa1a8" r={2} h={1.3} />
      <IsoStud cx={21.5} cy={24} fill="#9aa1a8" r={2} h={1.3} />
      {/* Golden Blaze-rod central Technic column & brewing arms */}
      <rect x="14.6" y="6" width="2.8" height="18" rx="1" fill={muted ? "#9a8858" : "#ffb820"} stroke="#b87410" strokeWidth="0.6" />
      <line x1="9" y1="12" x2="23" y2="12" stroke="#ffb820" strokeWidth="2" strokeLinecap="round" />
      <IsoStud cx={16} cy={6} fill="#ffe14a" r={2} h={1.4} />
      {/* 3 Translucent LEGO Potion flasks */}
      <polygon points="7,15 11,15 12,22 6,22" fill="#e23b2f" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.6" />
      <IsoStud cx={9} cy={14.8} fill="#d9dde2" r={1.3} h={1} />
      <polygon points="21,15 25,15 26,22 20,22" fill="#3ec8c8" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.6" />
      <IsoStud cx={23} cy={14.8} fill="#d9dde2" r={1.3} h={1} />
      <polygon points="14,17 18,17 19,24 13,24" fill="#f5c518" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.6" />
    </g>
  );
}

function LegoCampfire({ muted }: { muted?: boolean }) {
  return (
    <g>
      {/* Crossed Reddish-Brown LEGO Logs with studs */}
      <polygon points="4,22 25,14 28,17 7,25" fill="#6b3e22" stroke="#3a2010" strokeWidth="0.6" />
      <polygon points="7,14 28,22 25,25 4,17" fill="#8d5a34" stroke="#3a2010" strokeWidth="0.6" />
      <IsoStud cx={9} cy={21} fill="#8d5a34" r={1.8} h={1.2} />
      <IsoStud cx={23} cy={21} fill="#8d5a34" r={1.8} h={1.2} />
      {/* Molded Trans-Orange & Trans-Yellow LEGO Flame Plume */}
      <path
        d="M11 21 C10 15 13 11 14 7 C15.5 11 17 5 18 4 C19.5 9 22 14 21 21 Z"
        fill={muted ? "#b87840" : "#ff6210"}
      />
      <path
        d="M13 21 C13 16 15 13 16 9 C17.5 13 19 16 19 21 Z"
        fill="#ffe042"
      />
    </g>
  );
}

function LegoBed({ fill }: { fill: string }) {
  return (
    <g>
      {/* Wooden LEGO frame & feet */}
      <polygon points="3,18 16,24 29,18 16,12" fill="#c4924a" />
      <polygon points="3,18 16,24 16,28 3,22" fill="#8d5a34" />
      <polygon points="16,24 29,18 29,22 16,28" fill="#6b3e22" />
      {/* Red LEGO mattress with studs */}
      <polygon points="3,14 16,20 29,14 16,8" fill={shadeHex(fill, 16)} />
      <polygon points="3,14 16,20 16,24 3,18" fill={fill} />
      <polygon points="16,20 29,14 29,18 16,24" fill={shadeHex(fill, -24)} />
      {/* White LEGO Pillow brick at head */}
      <polygon points="16,7.5 26,12.2 21,14.6 11,9.9" fill="#ffffff" />
      <IsoStud cx={13} cy={14.5} fill={fill} r={2} h={1.3} />
      <IsoStud cx={18} cy={16.5} fill={fill} r={2} h={1.3} />
    </g>
  );
}

function LegoTNT() {
  return (
    <g>
      <IsoBrick topFill="#f25a46" leftFill="#e23b2f" rightFill="#b02620" studFill="#2a2a2a" />
      {/* White central TNT band */}
      <polygon points="4,15 16,21 16,25 4,19" fill="#f4f1ea" />
      <polygon points="16,21 28,15 28,19 16,25" fill="#e4dfd6" />
      {/* Bold TNT bars */}
      <line x1="7" y1="18" x2="13" y2="21" stroke="#1a1412" strokeWidth="2.2" />
      <line x1="19" y1="21" x2="25" y2="18" stroke="#1a1412" strokeWidth="2.2" />
    </g>
  );
}

function LegoBookshelf() {
  return (
    <g>
      <IsoBrick topFill="#f0c36e" leftFill="#d7a44e" rightFill="#a67c3a" studFill="#f0c36e" seams={false} />
      {/* 2 rows of colorful LEGO book spines on right face */}
      <polygon points="17,18 27,13 27,17 17,22" fill="#2a180c" />
      <polygon points="17,23 27,18 27,22 17,27" fill="#2a180c" />
      <line x1="18.5" y1="17.5" x2="18.5" y2="21.2" stroke="#e23b2f" strokeWidth="2" />
      <line x1="21" y1="16.2" x2="21" y2="20" stroke="#1f5fbf" strokeWidth="2" />
      <line x1="23.5" y1="15" x2="23.5" y2="18.8" stroke="#2f7d3a" strokeWidth="2" />
      <line x1="25.8" y1="13.8" x2="25.8" y2="17.5" stroke="#f5c518" strokeWidth="2" />
      <line x1="18.5" y1="22.5" x2="18.5" y2="26.2" stroke="#7a4ad4" strokeWidth="2" />
      <line x1="21" y1="21.2" x2="21" y2="25" stroke="#f07820" strokeWidth="2" />
      <line x1="23.5" y1="20" x2="23.5" y2="23.8" stroke="#e23b2f" strokeWidth="2" />
    </g>
  );
}

function LegoJukebox({ isJuke }: { isJuke: boolean }) {
  return (
    <g>
      <IsoBrick topFill="#c4924a" leftFill="#8a6428" rightFill="#5c4020" studFill="#c4924a" />
      {isJuke && <line x1="12" y1="11" x2="20" y2="11" stroke="#18120e" strokeWidth="2.2" strokeLinecap="round" />}
      <circle cx="22" cy="20" r="3" fill={isJuke ? "#ffd84a" : "#22160c"} />
    </g>
  );
}

function LegoDispenser({ isObserver }: { isObserver: boolean }) {
  return (
    <g>
      <IsoBrick topFill="#c5ccd3" leftFill="#8e959c" rightFill="#6e645c" studFill="#c5ccd3" />
      <circle cx="22" cy="20.5" r="2.8" fill={isObserver ? "#e23b2f" : "#1c1816"} stroke="#3a3430" strokeWidth="0.8" />
    </g>
  );
}

function LegoHopper() {
  return (
    <g>
      <polygon points="16,5 28,11 16,17 4,11" fill="#aeb6be" />
      <polygon points="4,11 16,17 16,22 7,17" fill="#6e767e" />
      <polygon points="16,17 28,11 25,17 16,22" fill="#4a5056" />
      <polygon points="11,19 21,19 19,26 13,26" fill="#6e767e" />
      <rect x="14" y="25" width="4" height="4" fill="#3a3e42" />
      <ellipse cx="16" cy="11" rx="6" ry="3" fill="#2a2e32" />
    </g>
  );
}

function LegoBeacon({ isConduit }: { isConduit: boolean }) {
  return (
    <g>
      {/* Obsidian baseplate */}
      <polygon points="4,22 16,28 28,22 16,16" fill="#2a1848" />
      {/* Trans-Cyan LEGO Glass Shell */}
      <IsoBrick topFill="rgba(180,248,255,0.68)" leftFill="rgba(94,216,230,0.58)" rightFill="rgba(46,176,196,0.58)" studFill="#9ae8e0" seams={false} />
      {/* Glowing Star Core */}
      <polygon points="16,11 19,16 16,21 13,16" fill="#ffffff" stroke={isConduit ? "#ffd84a" : "#3ec8c8"} strokeWidth="1.2" />
    </g>
  );
}

function LegoSpawner() {
  return (
    <g>
      <IsoBrick topFill="#3a3a44" leftFill="#2a2a32" rightFill="#1a1a22" studFill="#3aaa4c" />
      <circle cx="16" cy="19" r="3.2" fill="#ff6a18" />
    </g>
  );
}

function LegoEndFrame({ hasEye }: { hasEye: boolean }) {
  return (
    <g>
      <IsoBrick topFill="#ddd4a4" leftFill="#2a8a78" rightFill="#1e6456" studFill="#2a8a78" />
      {hasEye && <IsoStud cx={16} cy={9.5} fill="#7a4ad4" r={4} h={2.8} />}
    </g>
  );
}

function LegoEndCrystal() {
  return (
    <g>
      <polygon points="6,24 16,29 26,24 16,19" fill="#2a1848" />
      <polygon points="16,4 25,14 16,24 7,14" fill="#e87aff" stroke="#ffffff" strokeWidth="1" />
      <IsoStud cx={16} cy={5} fill="#f4e8ff" r={2.2} h={1.4} />
    </g>
  );
}

function LegoDragonEgg() {
  return (
    <g>
      <path d="M16 4 C23 9 25 18 23 26 C20 29 12 29 9 26 C7 18 9 9 16 4 Z" fill="#1a1030" stroke="#7a4ad4" strokeWidth="1" />
      <IsoStud cx={16} cy={5} fill="#7a4ad4" r={2.2} h={1.5} />
      <circle cx="13" cy="16" r="1.5" fill="#7a4ad4" />
      <circle cx="19" cy="20" r="1.8" fill="#7a4ad4" />
    </g>
  );
}

function LegoSpecialBlock({ id, fill }: { id: number; fill: string }) {
  return (
    <g>
      <IsoBrick topFill={shadeHex(fill, 18)} leftFill={fill} rightFill={shadeHex(fill, -24)} />
      {id === ID.Target && <circle cx="22" cy="20" r="3.5" fill="none" stroke="#e23b2f" strokeWidth="1.6" />}
      {id === ID.Hay && <polyline points="4,16 16,22 28,16" fill="none" stroke="#e23b2f" strokeWidth="1.5" />}
    </g>
  );
}

function LegoPiston() {
  return (
    <g>
      <IsoBrick topFill="#e0b15a" leftFill="#8e959c" rightFill="#6e767e" studFill="#e0b15a" />
      <polyline points="4,14 16,20 28,14" fill="none" stroke="#c4924a" strokeWidth="2.2" />
    </g>
  );
}

function LegoDaylight({ inv }: { inv: boolean }) {
  const c = inv ? "#3d7ad4" : "#f0c43a";
  return (
    <g>
      <polygon points="16,9 28,15 16,21 4,15" fill={c} />
      <polygon points="4,15 16,21 16,26 4,20" fill="#8d5a34" />
      <polygon points="16,21 28,15 28,20 16,26" fill="#6b3e22" />
      <IsoStud cx={16} cy={12.5} fill={c} r={2.2} h={1.2} />
      <IsoStud cx={11} cy={15} fill={c} r={2.2} h={1.2} />
      <IsoStud cx={21} cy={15} fill={c} r={2.2} h={1.2} />
      <IsoStud cx={16} cy={17.5} fill={c} r={2.2} h={1.2} />
    </g>
  );
}

// ─── BESPOKE 3D MOLDED LEGO TOOLS & WEAPONS ──────────────────────────────

function LegoPick({ fill }: { fill: string }) {
  const dark = shadeHex(fill, -28);
  return (
    <g>
      {/* Cylindrical LEGO bar handle + bottom pommel ring */}
      <rect x="14.2" y="11" width="3.6" height="17" rx="1.4" fill="#a67238" stroke="#5c3a18" strokeWidth="0.6" />
      <rect x="13.4" y="26" width="5.2" height="2.4" rx="0.8" fill="#6b3e22" />
      {/* Technic grey connector collar */}
      <rect x="13" y="9" width="6" height="3.8" rx="0.8" fill="#5c646c" />
      {/* Stepped LEGO Pickaxe Head Plates */}
      <path d="M4 12 L10 7 L22 7 L28 12 L25 15 L20 11 L12 11 L7 15 Z" fill={fill} stroke={dark} strokeWidth="0.7" />
      {/* LEGO Studs on pickaxe head */}
      <IsoStud cx={11.5} cy={7.5} fill={fill} r={1.8} h={1.2} />
      <IsoStud cx={16} cy={6.8} fill={fill} r={1.9} h={1.3} />
      <IsoStud cx={20.5} cy={7.5} fill={fill} r={1.8} h={1.2} />
    </g>
  );
}

function LegoAxe({ fill }: { fill: string }) {
  const dark = shadeHex(fill, -28);
  return (
    <g>
      <rect x="14.5" y="7" width="3.5" height="21" rx="1.4" fill="#a67238" stroke="#5c3a18" strokeWidth="0.6" />
      <rect x="13.6" y="26" width="5.2" height="2.4" rx="0.8" fill="#6b3e22" />
      {/* Bearded LEGO Wedge Axe Blade + Back Poll */}
      <path d="M18 8 L26 6 L27 16 L19 19 L18 14 Z" fill={fill} stroke={dark} strokeWidth="0.7" />
      <rect x="11" y="9" width="4" height="4.5" rx="0.8" fill={dark} />
      <IsoStud cx={16.2} cy={6.8} fill={fill} r={2} h={1.3} />
      <IsoStud cx={22.5} cy={9.5} fill={fill} r={1.8} h={1.2} />
    </g>
  );
}

function LegoShovel({ fill }: { fill: string }) {
  const dark = shadeHex(fill, -28);
  return (
    <g>
      <rect x="14.3" y="13" width="3.4" height="15" rx="1.4" fill="#a67238" stroke="#5c3a18" strokeWidth="0.6" />
      <rect x="12.8" y="26" width="6.4" height="2.6" rx="1" fill="#6b3e22" />
      {/* Molded LEGO Spade Scoop with central stud */}
      <path d="M10 6 C10 3 22 3 22 6 L21 15 L16 17 L11 15 Z" fill={fill} stroke={dark} strokeWidth="0.7" />
      <IsoStud cx={16} cy={9.5} fill={fill} r={2.2} h={1.4} />
    </g>
  );
}

function LegoSword({ fill }: { fill: string }) {
  const dark = shadeHex(fill, -30);
  const hi = shadeHex(fill, 28);
  return (
    <g>
      {/* LEGO Grip + Round Pommel Stud */}
      <rect x="14.3" y="21" width="3.4" height="6.5" rx="1.2" fill="#8d5a34" />
      <IsoStud cx={16} cy={28.5} fill="#ffd84a" r={2.4} h={1.4} />
      {/* Studded LEGO Crossguard */}
      <rect x="9" y="18.5" width="14" height="3.2" rx="1" fill="#ffd84a" stroke="#9e6e10" strokeWidth="0.6" />
      {/* Chamfered LEGO Blade with central fuller ridge & studs */}
      <polygon points="16,3 20.5,8 20.5,18.5 11.5,18.5 11.5,8" fill={fill} stroke={dark} strokeWidth="0.7" />
      <polygon points="16,3 16,18.5 11.5,18.5 11.5,8" fill={hi} opacity="0.45" />
      <IsoStud cx={16} cy={11} fill={fill} r={1.7} h={1.1} />
      <IsoStud cx={16} cy={15} fill={fill} r={1.7} h={1.1} />
    </g>
  );
}

function LegoTrident({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="14.5" y="11" width="3" height="18" rx="1.2" fill="#2a9a86" />
      <rect x="8" y="10" width="16" height="2.8" rx="1" fill="#7ee0e0" />
      <polygon points="9.5,3 11.5,10 7.5,10" fill={fill} />
      <polygon points="16,2 18,10 14,10" fill="#ffffff" />
      <polygon points="22.5,3 24.5,10 20.5,10" fill={fill} />
      <IsoStud cx={16} cy={11} fill="#7ee0e0" r={1.8} h={1.2} />
    </g>
  );
}

function LegoHoe({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="16.5" y="10" width="3.4" height="18" rx="1.4" fill="#a67238" />
      <path d="M7 9 L21 7 L21 12 L7 13 Z" fill={fill} stroke={shadeHex(fill, -26)} strokeWidth="0.7" />
      <IsoStud cx={12} cy={9.5} fill={fill} r={1.8} h={1.2} />
      <IsoStud cx={18} cy={8.5} fill={fill} r={1.8} h={1.2} />
    </g>
  );
}

function LegoBow({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M11 4 C22 8 22 24 11 28" fill="none" stroke={fill} strokeWidth="3.2" strokeLinecap="round" />
      <line x1="11" y1="4" x2="11" y2="28" stroke="#f4f1ea" strokeWidth="1.3" />
      {/* Nocked LEGO Arrow */}
      <line x1="7" y1="16" x2="25" y2="16" stroke="#c4924a" strokeWidth="2" />
      <polygon points="27,16 22,13 22,19" fill="#d9dde2" />
    </g>
  );
}

function LegoCrossbow() {
  return (
    <g>
      <rect x="14.2" y="7" width="3.6" height="20" rx="1.2" fill="#8a6428" />
      <path d="M5 13 Q16 7 27 13" fill="none" stroke="#5c646c" strokeWidth="3" strokeLinecap="round" />
      <line x1="5" y1="13" x2="27" y2="13" stroke="#f4f1ea" strokeWidth="1.2" />
      <IsoStud cx={16} cy={16} fill="#ffd84a" r={2} h={1.3} />
    </g>
  );
}

function LegoShield({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M7 5 H25 V18 L16 28 L7 18 Z" fill={fill} stroke="#8e959c" strokeWidth="2.2" />
      <IsoStud cx={12} cy={10} fill="#d9dde2" r={1.8} h={1.2} />
      <IsoStud cx={20} cy={10} fill="#d9dde2" r={1.8} h={1.2} />
      <IsoStud cx={16} cy={16} fill="#ffd84a" r={2.5} h={1.5} />
    </g>
  );
}

function LegoFishingRod() {
  return (
    <g>
      <line x1="7" y1="26" x2="23" y2="5" stroke="#8d5a34" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="11" cy="21" r="2.2" fill="#8e959c" />
      <line x1="23" y1="5" x2="24" y2="22" stroke="#f4f1ea" strokeWidth="1.1" />
      <IsoStud cx={24} cy={23} fill="#e23b2f" r={2} h={1.4} />
    </g>
  );
}

function LegoShears() {
  return (
    <g>
      <polygon points="8,7 19,18 16,20 6,10" fill="#d9dde2" />
      <polygon points="24,7 13,18 16,20 26,10" fill="#aeb6be" />
      <circle cx="12" cy="23" r="3.2" fill="none" stroke="#c43228" strokeWidth="2.2" />
      <circle cx="20" cy="23" r="3.2" fill="none" stroke="#c43228" strokeWidth="2.2" />
      <IsoStud cx={16} cy={16.5} fill="#ffd84a" r={1.7} h={1.1} />
    </g>
  );
}

function LegoFlintSteel() {
  return (
    <g>
      <path d="M8 10 H18 V15 H12 V22 H18 V26 H8 Z" fill="#8e959c" />
      <polygon points="18,12 26,16 22,25 16,20" fill="#3a3632" />
      <IsoStud cx={21} cy={9} fill="#ff7820" r={2.2} h={1.4} />
    </g>
  );
}

// ─── LEGO MINIFIG ARMOR & WEARABLES ──────────────────────────────────────

function LegoHelmet({ fill }: { fill: string }) {
  return (
    <g>
      <IsoStud cx={16} cy={6.5} fill={fill} r={3} h={1.8} />
      <path d="M7 18 C7 9 25 9 25 18 V25 H20 V18 H12 V25 H7 Z" fill={fill} stroke={shadeHex(fill, -30)} strokeWidth="1" />
    </g>
  );
}

function LegoChestplate({ fill }: { fill: string }) {
  return (
    <g>
      <polygon points="6,8 26,8 24,26 8,26" fill={fill} stroke={shadeHex(fill, -30)} strokeWidth="1" />
      <polygon points="12,8 20,8 18,13 14,13" fill="#221e1b" />
      <IsoStud cx={12} cy={16} fill={shadeHex(fill, 20)} r={2} h={1.3} />
      <IsoStud cx={20} cy={16} fill={shadeHex(fill, 20)} r={2} h={1.3} />
    </g>
  );
}

function LegoLeggings({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="8" y="6" width="16" height="6" rx="1" fill={shadeHex(fill, -20)} />
      <rect x="8.5" y="12" width="6.5" height="15" rx="1" fill={fill} />
      <rect x="17" y="12" width="6.5" height="15" rx="1" fill={fill} />
      <IsoStud cx={11.8} cy={6.2} fill={fill} r={2} h={1.2} />
      <IsoStud cx={20.2} cy={6.2} fill={fill} r={2} h={1.2} />
    </g>
  );
}

function LegoBoots({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M6 12 H14 V25 H4 V20 H6 Z" fill={fill} stroke={shadeHex(fill, -28)} strokeWidth="0.8" />
      <path d="M18 12 H26 V20 H28 V25 H18 Z" fill={fill} stroke={shadeHex(fill, -28)} strokeWidth="0.8" />
      <IsoStud cx={10} cy={12} fill={fill} r={2} h={1.3} />
      <IsoStud cx={22} cy={12} fill={fill} r={2} h={1.3} />
    </g>
  );
}

function LegoElytra({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M16 6 L6 10 L8 27 L15 21 Z" fill={fill} stroke={shadeHex(fill, -28)} strokeWidth="0.8" />
      <path d="M16 6 L26 10 L24 27 L17 21 Z" fill={shadeHex(fill, -14)} stroke={shadeHex(fill, -28)} strokeWidth="0.8" />
      <IsoStud cx={16} cy={6.5} fill="#ffd84a" r={2.2} h={1.4} />
    </g>
  );
}

// ─── LEGO TORCHES, LANTERNS, DOORS, REDSTONE ─────────────────────────────

function LegoTorch({ isRed }: { isRed: boolean }) {
  const c1 = isRed ? "#e23b2f" : "#ff7820";
  const c2 = isRed ? "#ff9a8a" : "#ffe14a";
  return (
    <g>
      <rect x="13.8" y="14" width="4.4" height="14" rx="1.2" fill="#8d5a34" stroke="#4e2c18" strokeWidth="0.6" />
      <rect x="12.5" y="12.5" width="7" height="2.6" rx="0.8" fill="#ffd84a" />
      <path d="M16 3 C20 7 22 10 19 13 H13 C10 10 12 7 16 3 Z" fill={c1} />
      <IsoStud cx={16} cy={10} fill={c2} r={2.2} h={1.5} />
    </g>
  );
}

function LegoLantern() {
  return (
    <g>
      <circle cx="16" cy="5.5" r="2" fill="none" stroke="#5c646c" strokeWidth="1.6" />
      <polygon points="10,9 22,9 24,12 8,12" fill="#4a5056" />
      <rect x="10" y="12" width="12" height="12" rx="1.5" fill="#ffe14a" stroke="#4a5056" strokeWidth="1.6" />
      <IsoStud cx={16} cy={18} fill="#ff7820" r={2.6} h={1.8} />
      <rect x="8.5" y="24" width="15" height="3" rx="1" fill="#4a5056" />
    </g>
  );
}

function LegoDoor({ fill, isGate }: { fill: string; isGate: boolean }) {
  if (isGate) {
    return (
      <g>
        <rect x="5" y="9" width="4" height="16" rx="1" fill={shadeHex(fill, -20)} />
        <rect x="23" y="9" width="4" height="16" rx="1" fill={shadeHex(fill, -20)} />
        <rect x="8" y="12" width="16" height="3.5" fill={fill} />
        <rect x="8" y="18" width="16" height="3.5" fill={fill} />
        <IsoStud cx={7} cy={9} fill={fill} r={2} h={1.3} />
        <IsoStud cx={25} cy={9} fill={fill} r={2} h={1.3} />
      </g>
    );
  }
  return (
    <g>
      <rect x="8" y="4" width="16" height="24" rx="1.5" fill={fill} stroke={shadeHex(fill, -30)} strokeWidth="1" />
      <rect x="10.5" y="6.5" width="5" height="7" fill="#2a1c12" />
      <rect x="16.5" y="6.5" width="5" height="7" fill="#2a1c12" />
      <IsoStud cx={20.5} cy={17.5} fill="#ffd84a" r={1.8} h={1.2} />
    </g>
  );
}

function LegoFence({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="7" y="8" width="4.5" height="19" rx="1" fill={fill} />
      <rect x="20.5" y="8" width="4.5" height="19" rx="1" fill={fill} />
      <rect x="5" y="12" width="22" height="3.5" rx="0.8" fill={shadeHex(fill, 14)} />
      <rect x="5" y="19" width="22" height="3.5" rx="0.8" fill={shadeHex(fill, 14)} />
      <IsoStud cx={9.2} cy={8} fill={fill} r={2.1} h={1.4} />
      <IsoStud cx={22.8} cy={8} fill={fill} r={2.1} h={1.4} />
    </g>
  );
}

function LegoLadder({ fill }: { fill: string }) {
  return (
    <g stroke={fill} strokeWidth="2.6" strokeLinecap="round">
      <line x1="9" y1="4" x2="9" y2="28" />
      <line x1="23" y1="4" x2="23" y2="28" />
      <line x1="9" y1="8" x2="23" y2="8" />
      <line x1="9" y1="14" x2="23" y2="14" />
      <line x1="9" y1="20" x2="23" y2="20" />
      <line x1="9" y1="26" x2="23" y2="26" />
    </g>
  );
}

function LegoRail() {
  return (
    <g>
      <rect x="6" y="8" width="20" height="3" fill="#8d5a34" />
      <rect x="6" y="14.5" width="20" height="3" fill="#8d5a34" />
      <rect x="6" y="21" width="20" height="3" fill="#8d5a34" />
      <rect x="8.5" y="4" width="3" height="24" rx="1" fill="#d9dde2" />
      <rect x="20.5" y="4" width="3" height="24" rx="1" fill="#d9dde2" />
    </g>
  );
}

function LegoLever() {
  return (
    <g>
      <polygon points="6,22 16,27 26,22 16,17" fill="#8e959c" />
      <line x1="16" y1="21" x2="22" y2="8" stroke="#8d5a34" strokeWidth="3" strokeLinecap="round" />
      <IsoStud cx={22} cy={8} fill="#e23b2f" r={2.4} h={1.5} />
    </g>
  );
}

function LegoRedstonePlate({ id, fill }: { id: number; fill: string }) {
  return (
    <g>
      <polygon points="16,11 28,17 16,23 4,17" fill="#9aa1a8" />
      <polygon points="4,17 16,23 16,26 4,20" fill="#6e767e" />
      <polygon points="16,23 28,17 28,20 16,26" fill="#4a5056" />
      <IsoStud cx={12} cy={16} fill={id === ID.Plate ? fill : "#e23b2f"} r={2.2} h={1.6} />
      <IsoStud cx={20} cy={16} fill={id === ID.Plate ? fill : "#e23b2f"} r={2.2} h={1.6} />
    </g>
  );
}

function LegoRedstoneDust({ fill }: { fill: string }) {
  return (
    <g>
      <IsoStud cx={16} cy={11} fill={fill} r={3} h={1.8} />
      <IsoStud cx={11} cy={17} fill={fill} r={3} h={1.8} />
      <IsoStud cx={21} cy={17} fill={fill} r={3} h={1.8} />
      <IsoStud cx={16} cy={22} fill={fill} r={3} h={1.8} />
    </g>
  );
}

// ─── LEGO POTIONS, BUCKETS, FOOD & ITEMS ─────────────────────────────────

function LegoPotion({ fill, splash, empty }: { fill: string; splash?: boolean; empty?: boolean }) {
  return (
    <g>
      {/* Translucent LEGO Erlenmeyer Flask Body */}
      <path
        d={splash ? "M13 8 H19 L25 18 C26 24 22 28 16 28 C10 28 6 24 7 18 Z" : "M13 9 H19 V13 L24 21 C25 25 22 28 16 28 C10 28 7 25 8 21 L13 13 Z"}
        fill={empty ? "rgba(213,243,246,0.45)" : fill}
        stroke="#e7fbff"
        strokeWidth="1.3"
      />
      {/* Top LEGO 1x1 Cork Stud Stopper */}
      <IsoStud cx={16} cy={7.5} fill="#c4924a" r={2.6} h={1.8} />
      {/* Glossy plastic reflection strip */}
      <path d="M11 19 Q10 23 13 25" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

function LegoBucket({ id, fill }: { id: number; fill: string }) {
  const liq = id === ID.WaterBucket ? "#3b96e4" : id === ID.LavaBucket ? "#ff7820" : id === ID.Milk ? "#ffffff" : "#3a3e42";
  return (
    <g>
      <path d="M9 12 C9 6 23 6 23 12" fill="none" stroke="#5c646c" strokeWidth="1.8" />
      <polygon points="8,12 24,12 21,27 11,27" fill="#c5ccd3" stroke="#6e767e" strokeWidth="0.9" />
      <ellipse cx="16" cy="12" rx="8" ry="3.2" fill={liq} stroke="#8e959c" strokeWidth="1" />
      {id !== ID.Bucket && <IsoStud cx={16} cy={12} fill={fill} r={2.6} h={1.4} />}
    </g>
  );
}

function LegoFood({ block, fill }: { block: BlockDef; fill: string }) {
  const id = block.id;
  if (id === ID.Apple || id === ID.Gapple || id === ID.Beetroot) {
    return (
      <g>
        <circle cx="16" cy="18" r="8" fill={fill} stroke={shadeHex(fill, -28)} strokeWidth="0.8" />
        <IsoStud cx={16} cy={9.5} fill="#3aaa4c" r={2.4} h={1.6} />
        <circle cx="13" cy="15" r="1.8" fill="rgba(255,255,255,0.45)" />
      </g>
    );
  }
  if (id === ID.Bread || id === ID.BakedPotato || id === ID.Potato) {
    return (
      <g>
        <rect x="5" y="12" width="22" height="12" rx="5" fill={fill} stroke={shadeHex(fill, -28)} strokeWidth="0.9" />
        <IsoStud cx={11} cy={12} fill={shadeHex(fill, 16)} r={2.2} h={1.4} />
        <IsoStud cx={21} cy={12} fill={shadeHex(fill, 16)} r={2.2} h={1.4} />
      </g>
    );
  }
  if (id === ID.Carrot) {
    return (
      <g>
        <polygon points="9,26 15,10 21,14" fill="#f07820" stroke="#c45a10" strokeWidth="0.8" />
        <IsoStud cx={19} cy={10} fill="#3aaa4c" r={2.4} h={1.6} />
      </g>
    );
  }
  if (id === ID.RawMeat || id === ID.Cooked) {
    return (
      <g>
        <rect x="6" y="15" width="7" height="4" rx="1.8" fill="#f4f1ea" />
        <ellipse cx="18" cy="17" rx="8.5" ry="6.5" fill={fill} stroke={shadeHex(fill, -28)} strokeWidth="0.9" />
        <IsoStud cx={16} cy={14.5} fill={shadeHex(fill, 16)} r={2.2} h={1.4} />
        <IsoStud cx={21} cy={16.5} fill={shadeHex(fill, 16)} r={2.2} h={1.4} />
      </g>
    );
  }
  if (id === ID.Fish || id === ID.CookedFish) {
    return (
      <g>
        <polygon points="22,16 28,11 28,21" fill={fill} />
        <ellipse cx="14" cy="16" rx="8" ry="5" fill={fill} />
        <IsoStud cx={14} cy={13} fill={shadeHex(fill, 18)} r={2} h={1.2} />
        <circle cx="9.5" cy="15" r="1.2" fill="#1a1412" />
      </g>
    );
  }
  if (id === ID.Stew || id === ID.Pie) {
    return (
      <g>
        <path d="M6 15 H26 L23 26 H9 Z" fill="#8d5a34" />
        <ellipse cx="16" cy="15" rx="10" ry="3.8" fill={fill} />
        <IsoStud cx={13} cy={14.5} fill="#e23b2f" r={2} h={1.3} />
        <IsoStud cx={19} cy={14.5} fill="#f5c518" r={2} h={1.3} />
      </g>
    );
  }
  return (
    <g>
      <circle cx="16" cy="17" r="7.5" fill={fill} />
      <IsoStud cx={16} cy={11} fill={shadeHex(fill, 18)} r={2.4} h={1.5} />
    </g>
  );
}

function LegoCactus() {
  return (
    <g>
      {/* Left L-shaped LEGO Saguaro Arm + Top Stud */}
      <rect x="4" y="15" width="6" height="4" rx="0.8" fill="#2f8e3c" stroke="#164e1f" strokeWidth="0.7" />
      <rect x="4" y="9" width="4.5" height="9" rx="0.8" fill="#3aaa4c" stroke="#164e1f" strokeWidth="0.7" />
      <IsoStud cx={6.2} cy={9} fill="#46b856" r={1.8} h={1.2} />
      {/* Right L-shaped LEGO Saguaro Arm + Top Stud */}
      <rect x="22" y="13" width="6" height="4" rx="0.8" fill="#236e2e" stroke="#164e1f" strokeWidth="0.7" />
      <rect x="23.5" y="7" width="4.5" height="9" rx="0.8" fill="#2f8e3c" stroke="#164e1f" strokeWidth="0.7" />
      <IsoStud cx={25.8} cy={7} fill="#3aaa4c" r={1.8} h={1.2} />
      {/* Central 3-Course Isometric Fluted LEGO Cactus Column */}
      <polygon points="16,5 23,8.5 16,12 9,8.5" fill="#46b856" />
      <polygon points="9,8.5 16,12 16,29 9,25.5" fill="#349a44" />
      <polygon points="16,12 23,8.5 23,25.5 16,29" fill="#236e2e" />
      {/* Vertical Fluted Rib Grooves & Horizontal LEGO Brick Seams */}
      <line x1="11.5" y1="10" x2="11.5" y2="26.5" stroke="#164e1f" strokeWidth="1" />
      <line x1="14" y1="11" x2="14" y2="28" stroke="#5ad266" strokeWidth="0.9" />
      <line x1="18.5" y1="11" x2="18.5" y2="28" stroke="#164e1f" strokeWidth="1" />
      <line x1="21" y1="10" x2="21" y2="26.5" stroke="#3aaa4c" strokeWidth="0.8" />
      <polyline points="9,14 16,17.5 23,14" fill="none" stroke="rgba(0,0,0,0.32)" strokeWidth="0.7" />
      <polyline points="9,20 16,23.5 23,20" fill="none" stroke="rgba(0,0,0,0.32)" strokeWidth="0.7" />
      {/* Protruding Cream-White LEGO Spine Needles */}
      <rect x="7.5" y="12" width="2" height="1.3" fill="#f7f2e2" />
      <rect x="7.5" y="21" width="2" height="1.3" fill="#f7f2e2" />
      <rect x="22.5" y="17" width="2" height="1.3" fill="#f7f2e2" />
      <rect x="22.5" y="22" width="2" height="1.3" fill="#f7f2e2" />
      <rect x="14.2" y="15" width="1.8" height="1.3" fill="#f7f2e2" />
      <rect x="14.2" y="22" width="1.8" height="1.3" fill="#f7f2e2" />
      {/* Top LEGO Studs & Blooming Pink/Yellow Desert Cactus Flower */}
      <IsoStud cx={13} cy={8.5} fill="#46b856" r={1.8} h={1.2} />
      <IsoStud cx={19} cy={8.5} fill="#46b856" r={1.8} h={1.2} />
      <IsoStud cx={16} cy={6.8} fill="#f26498" r={2.5} h={1.6} />
      <IsoStud cx={16} cy={5.2} fill="#ffe14a" r={1.4} h={1.0} />
    </g>
  );
}

function LegoPlant({ block, fill }: { block: BlockDef; fill: string }) {
  return (
    <g>
      <rect x="14.6" y="13" width="2.8" height="14" rx="1" fill="#2f7d3a" />
      <IsoStud cx={16} cy={11} fill={fill} r={4.5} h={2.2} />
      {!block.crop && <IsoStud cx={16} cy={8.5} fill="#ffe14a" r={2} h={1.2} />}
    </g>
  );
}

function LegoBoat({ fill }: { fill: string }) {
  return (
    <g>
      <polygon points="4,16 16,11 28,16 24,25 8,25" fill={fill} stroke={shadeHex(fill, -28)} strokeWidth="0.9" />
      <polygon points="8,16 16,13 24,16 21,21 11,21" fill="#5c3818" />
      <IsoStud cx={13} cy={18} fill={fill} r={2} h={1.3} />
      <IsoStud cx={19} cy={18} fill={fill} r={2} h={1.3} />
    </g>
  );
}

function LegoMinecart() {
  return (
    <g>
      <polygon points="5,11 27,11 24,23 8,23" fill="#9aa1a8" stroke="#4a5056" strokeWidth="1" />
      <circle cx="10.5" cy="25" r="2.8" fill="#2a2e32" stroke="#d9dde2" strokeWidth="1" />
      <circle cx="21.5" cy="25" r="2.8" fill="#2a2e32" stroke="#d9dde2" strokeWidth="1" />
      <IsoStud cx={12} cy={11} fill="#c5ccd3" r={2} h={1.3} />
      <IsoStud cx={20} cy={11} fill="#c5ccd3" r={2} h={1.3} />
    </g>
  );
}

function LegoSaddle() {
  return (
    <g>
      <path d="M6 12 Q16 18 26 12 L24 23 H8 Z" fill="#8d5a34" stroke="#4e2c18" strokeWidth="1" />
      <IsoStud cx={16} cy={22} fill="#ffd84a" r={2} h={1.3} />
    </g>
  );
}

function LegoArrow() {
  return (
    <g>
      <line x1="6" y1="26" x2="24" y2="8" stroke="#c4924a" strokeWidth="2.4" />
      <polygon points="27,5 20,7 25,12" fill="#d9dde2" />
      <polygon points="5,27 9,23 11,27" fill="#f4f1ea" />
    </g>
  );
}

function LegoFirework() {
  return (
    <g>
      <rect x="15" y="14" width="2" height="14" fill="#c4924a" />
      <rect x="11.5" y="9" width="9" height="11" rx="1" fill="#f4f1ea" stroke="#e23b2f" strokeWidth="1.5" />
      <polygon points="16,3 22,9 10,9" fill="#e23b2f" />
      <IsoStud cx={16} cy={3.5} fill="#ffd84a" r={1.6} h={1.1} />
    </g>
  );
}

function LegoRodPiece({ id, fill }: { id: number; fill: string }) {
  return (
    <g>
      <rect x="13.8" y="5" width="4.4" height="22" rx="1.8" transform="rotate(24 16 16)" fill={fill} stroke={shadeHex(fill, -26)} strokeWidth="0.7" />
      {id === ID.Bone && (
        <>
          <circle cx="11" cy="7" r="2.6" fill={fill} />
          <circle cx="21" cy="25" r="2.6" fill={fill} />
        </>
      )}
    </g>
  );
}

function LegoDialTile({ isClock, fill }: { isClock: boolean; fill: string }) {
  return (
    <g>
      <circle cx="16" cy="17" r="10" fill="#2a241c" stroke={isClock ? "#f0c43a" : "#adb5bd"} strokeWidth="2.4" />
      <IsoStud cx={16} cy={7} fill={fill} r={2.2} h={1.4} />
      <line x1="16" y1="17" x2="16" y2="10" stroke={fill} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="16" y1="17" x2="21" y2="19" stroke="#f4f1ea" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
}

function LegoPrintedTile({ fill }: { id: number; fill: string }) {
  return (
    <g>
      <polygon points="16,7 27,12.5 16,18 5,12.5" fill={fill} stroke="#8d5a34" strokeWidth="0.8" />
      <polygon points="5,12.5 16,18 16,22 5,16.5" fill={shadeHex(fill, -22)} />
      <polygon points="16,18 27,12.5 27,16.5 16,22" fill={shadeHex(fill, -38)} />
      <path d="M11 12.5 L15 10.5 L18 13 L21 11" fill="none" stroke="#2f7d3a" strokeWidth="1.5" />
    </g>
  );
}

function LegoBook({ fill, enchanted }: { fill: string; enchanted: boolean }) {
  return (
    <g>
      <rect x="7" y="5" width="18" height="22" rx="2" fill={fill} stroke={enchanted ? "#ffd84a" : shadeHex(fill, -30)} strokeWidth="1.4" />
      <rect x="10" y="7" width="13" height="18" fill="#f4f1ea" />
      <rect x="11" y="7" width="11" height="18" fill={fill} />
      <IsoStud cx={14} cy={12} fill={enchanted ? "#ffd84a" : shadeHex(fill, 22)} r={2} h={1.3} />
      <IsoStud cx={19} cy={12} fill={enchanted ? "#ffd84a" : shadeHex(fill, 22)} r={2} h={1.3} />
    </g>
  );
}

function LegoSignBanner({ fill }: { id: number; fill: string }) {
  return (
    <g>
      <rect x="14.5" y="14" width="3" height="14" fill="#8d5a34" />
      <rect x="5" y="6" width="22" height="12" rx="1.2" fill={fill} stroke={shadeHex(fill, -28)} strokeWidth="1" />
      <IsoStud cx={11} cy={6} fill={fill} r={2} h={1.3} />
      <IsoStud cx={21} cy={6} fill={fill} r={2} h={1.3} />
    </g>
  );
}

function LegoHorn({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M7 22 C9 12 16 8 25 6 C26 14 21 22 12 25 Z" fill={fill} stroke="#8d5a34" strokeWidth="1" />
      <IsoStud cx={8.5} cy={22} fill="#c4924a" r={2.4} h={1.6} />
    </g>
  );
}

function LegoCord({ fill }: { fill: string }) {
  return (
    <g>
      <circle cx="16" cy="17" r="7" fill="none" stroke={fill} strokeWidth="2.8" />
      <IsoStud cx={16} cy={9.5} fill={fill} r={2.2} h={1.4} />
    </g>
  );
}

function LegoFeather() {
  return (
    <g>
      <path d="M9 26 C11 16 17 8 24 5 C24 14 19 21 11 26 Z" fill="#ffffff" stroke="#c5ccd3" strokeWidth="0.9" />
      <line x1="8" y1="27" x2="23" y2="6" stroke="#e7e2d8" strokeWidth="1.6" />
    </g>
  );
}

function LegoTotem() {
  return (
    <g>
      <IsoStud cx={16} cy={6} fill="#ffd84a" r={3} h={1.8} />
      <rect x="10" y="7" width="12" height="8" rx="1.5" fill="#f0c43a" />
      <circle cx="13.5" cy="11" r="1.4" fill="#3aaa4c" />
      <circle cx="18.5" cy="11" r="1.4" fill="#3aaa4c" />
      <polygon points="5,15 27,15 23,20 9,20" fill="#ffd84a" />
      <rect x="11" y="16" width="10" height="11" rx="1.2" fill="#e2b12e" />
    </g>
  );
}

function LegoNetherStar() {
  return (
    <g>
      <polygon points="16,3 19.5,12.5 29,16 19.5,19.5 16,29 12.5,19.5 3,16 12.5,12.5" fill="#f4e8ff" stroke="#7ee0e0" strokeWidth="1.2" />
      <IsoStud cx={16} cy={16} fill="#ffffff" r={2.8} h={1.6} />
    </g>
  );
}

function LegoSkull() {
  return (
    <g>
      <IsoStud cx={16} cy={6.5} fill="#2a2a2a" r={3} h={1.8} />
      <rect x="8" y="8" width="16" height="15" rx="2.5" fill="#2a2a2a" stroke="#141414" strokeWidth="1" />
      <rect x="10.5" y="13" width="3.5" height="3.5" fill="#f4f1ea" />
      <rect x="18" y="13" width="3.5" height="3.5" fill="#f4f1ea" />
      <rect x="12" y="19" width="8" height="2.5" fill="#141414" />
    </g>
  );
}

function LegoOrb({ id, fill }: { id: number; fill: string }) {
  return (
    <g>
      <circle cx="16" cy="17" r="8.5" fill={fill} stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
      {id === ID.Eye && <ellipse cx="16" cy="17" rx="2.2" ry="5.5" fill="#ffeb5a" />}
      <IsoStud cx={16} cy={8.5} fill={shadeHex(fill, 22)} r={2.6} h={1.6} />
    </g>
  );
}

function LegoDisc({ fill }: { fill: string }) {
  return (
    <g>
      <ellipse cx="16" cy="17" rx="11" ry="7" fill="#1e1e24" stroke="#3a3a44" strokeWidth="1" />
      <ellipse cx="16" cy="17" rx="4.8" ry="3" fill={fill} />
      <IsoStud cx={16} cy={16.5} fill="#1e1e24" r={1.8} h={1.2} />
    </g>
  );
}

function LegoIngotTile({ fill }: { fill: string }) {
  const top = shadeHex(fill, 24);
  const side = shadeHex(fill, -26);
  return (
    <g>
      {/* Sloped 1x2 LEGO Metallic Bullion Tile with 2 studs */}
      <polygon points="8,13 22,9 26,15 10,20" fill={top} />
      <polygon points="6,18 8,13 10,20 8,24" fill={fill} />
      <polygon points="8,24 10,20 26,15 25,20" fill={side} />
      <IsoStud cx={14} cy={13.5} fill={top} r={2.2} h={1.4} />
      <IsoStud cx={20} cy={11.8} fill={top} r={2.2} h={1.4} />
    </g>
  );
}

function LegoCrystalGem({ fill }: { fill: string }) {
  const hi = shadeHex(fill, 38);
  const dark = shadeHex(fill, -28);
  return (
    <g>
      {/* Faceted Trans-Clear / Trans-Neon LEGO Gem with top stud */}
      <polygon points="16,5 25,13 21,26 11,26 7,13" fill={fill} stroke={hi} strokeWidth="0.9" />
      <polygon points="16,5 16,26 11,26 7,13" fill={hi} opacity="0.38" />
      <polygon points="16,5 25,13 21,26 16,26" fill={dark} opacity="0.28" />
      <IsoStud cx={16} cy={6} fill={hi} r={2.2} h={1.4} />
    </g>
  );
}
