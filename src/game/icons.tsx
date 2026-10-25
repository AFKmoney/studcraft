import type { ReactNode } from "react";
import { ID, def, type BlockDef } from "./blocks";

export function ItemIcon({ id, muted = false }: { id: number; muted?: boolean }) {
  if (id <= 0) return null;
  const block = def(id);
  const fill = muted ? "#6b6256" : block.color;
  return (
    <svg className="item-icon" viewBox="0 0 32 32" aria-hidden="true">
      {glyph(block, fill)}
    </svg>
  );
}

function glyph(block: BlockDef, fill: string): ReactNode {
  if (block.tool === "pick") return <Pick fill={fill} />;
  if (block.tool === "axe") return <Axe fill={fill} />;
  if (block.tool === "shovel") return <Spade fill={fill} />;
  if (block.tool === "sword") return <Blade fill={fill} />;
  if (block.tool === "hoe") return <Hoe fill={fill} />;
  if (block.tool === "bow" || block.id === ID.AntlerBow) return <Bow fill={fill} />;
  if (block.armorSlot === 1) return <Cap fill={fill} />;
  if (block.armorSlot === 2) return <Shell fill={fill} />;
  if (block.armorSlot === 3) return <Legs fill={fill} />;
  if (block.armorSlot === 4) return <Boots fill={fill} />;
  if (block.food > 0) return <Bite fill={fill} meat={block.id === ID.RawMeat || block.id === ID.Cooked || block.id === ID.Fish} loaf={block.id === ID.Bread || block.id === ID.Wheat} />;
  if (block.fluid) return <Drop fill={fill} />;
  if (block.plant || block.crop || block.sapling || block.cane) return <Sprout fill={fill} bloom={!block.crop && block.id !== ID.TallGrass && block.id !== ID.Reed} />;
  if (block.glass) return <Pane fill={fill} />;
  if (block.torch || block.id === ID.Campfire) return <Flame fill={fill} />;
  if (block.door || block.gate) return <Door fill={fill} />;
  if (block.work === "chest") return <Crate fill={fill} />;
  if (block.work === "furnace") return <Kiln fill={fill} />;
  if (block.work === "bench") return <Bench fill={fill} />;
  if (block.work === "bed") return <Bed fill={fill} />;
  if (block.work === "anvil") return <Anvil fill={fill} />;
  if (block.work === "enchant" || block.work === "brew" || block.id === ID.Bottle || block.name.includes("brew")) return <Flask fill={fill} />;
  if (block.id === ID.Arrow) return <Dart fill={fill} />;
  if (block.id === ID.Stick || block.id === ID.Rod) return <Rod fill={fill} />;
  if (block.id === ID.Compass) return <CompassMark fill={fill} />;
  if (block.id === ID.Clock) return <ClockMark fill={fill} />;
  if (block.id === ID.Map) return <MapMark fill={fill} />;
  if (block.id === ID.Banner) return <BannerMark fill={fill} />;
  if (block.id === ID.Lead) return <LeadMark fill={fill} />;
  if (block.id === ID.EndCrystal) return <CrystalMark fill={fill} />;
  if (block.id === ID.Horn) return <HornMark fill={fill} />;
  if (block.id === ID.Book || block.id === ID.Bookshelf) return <BookMark fill={fill} />;
  if (block.id === ID.Paper) return <PaperMark fill={fill} />;
  if (block.id === ID.Ingot || block.id === ID.RawIron || block.id === ID.GravelBar) return <Bar fill={fill} />;
  if (block.id === ID.Bucket || block.id === ID.WaterBucket || block.id === ID.Milk) return <Pail fill={fill} />;
  if (block.need >= 2 || block.id === ID.Coal || block.id === ID.Emerald) return <Gem fill={fill} />;
  return <Stud fill={fill} mark={block.id} />;
}

function CompassMark({ fill }: { fill: string }) {
  return (
    <g>
      <circle cx="16" cy="16" r="11" fill="#2a241c" stroke={fill} strokeWidth="2" />
      <path d="M16 6l3 10-3-2-3 2z" fill={fill} />
      <path d="M16 26l-3-10 3 2 3-2z" fill="#f4f1ea" opacity="0.8" />
    </g>
  );
}
function ClockMark({ fill }: { fill: string }) {
  return (
    <g>
      <circle cx="16" cy="16" r="11" fill="#2a241c" stroke={fill} strokeWidth="2" />
      <path d="M16 16V8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
      <path d="M16 16l5 3" stroke="#f4f1ea" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}
function MapMark({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="6" y="5" width="20" height="22" rx="1" fill={fill} />
      <path d="M10 20l4-6 3 3 5-7" fill="none" stroke="#2f7d3a" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="1.4" fill="#3b96e4" />
    </g>
  );
}
function BannerMark({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="15" y="4" width="2" height="24" fill="#c4924a" />
      <path d="M17 6h10l-2 4 2 4H17z" fill={fill} />
    </g>
  );
}
function LeadMark({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M8 8c8 2 8 8 4 10s-2 6 6 8" fill="none" stroke={fill} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="22" cy="24" r="2.2" fill="none" stroke={fill} strokeWidth="1.6" />
    </g>
  );
}
function CrystalMark({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M16 4l7 8-7 16-7-16z" fill={fill} />
      <path d="M9 12h14" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.2" />
    </g>
  );
}
function HornMark({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M8 22c2-8 8-12 16-14 1 6-2 12-8 16z" fill={fill} />
      <rect x="6" y="18" width="6" height="6" rx="1" fill="#c4924a" />
    </g>
  );
}
function BookMark({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="8" y="5" width="16" height="22" rx="1.5" fill={fill} />
      <rect x="11" y="8" width="10" height="2" fill="#f4f1ea" />
      <rect x="11" y="12" width="10" height="2" fill="#f4f1ea" />
      <rect x="11" y="16" width="7" height="2" fill="#f4f1ea" />
    </g>
  );
}
function PaperMark({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="9" y="4" width="14" height="18" fill={fill} />
      <rect x="12" y="8" width="12" height="18" fill="#fff" opacity="0.85" />
      <path d="M14 14h8M14 18h8M14 22h5" stroke="#1c140e" strokeWidth="1.2" />
    </g>
  );
}

function Stud({ fill, mark }: { fill: string; mark: number }) {
  const notch = mark % 6;
  return (
    <g>
      <rect x="5" y="12" width="22" height="14" rx="2" fill={fill} />
      <rect x="5" y="12" width="22" height="3.5" fill="#fff" opacity="0.28" />
      <rect x="5" y="22.5" width="22" height="3.5" fill="#000" opacity="0.22" />
      <circle cx="11" cy="9" r="2.5" fill={fill} stroke="#000" strokeOpacity="0.25" />
      <circle cx="21" cy="9" r="2.5" fill={fill} stroke="#000" strokeOpacity="0.25" />
      {notch === 1 && <circle cx="16" cy="18" r="2" fill="#fff" opacity="0.75" />}
      {notch === 2 && <path d="M10 18h12" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" />}
      {notch === 3 && <path d="M12 16l4 4 4-4" fill="none" stroke="#1c140e" strokeWidth="1.4" />}
      {notch === 4 && <rect x="13" y="16" width="6" height="6" fill="#000" opacity="0.28" />}
      {notch === 5 && <path d="M11 16h10M11 20h10" stroke="#fff" strokeOpacity="0.65" strokeWidth="1.3" />}
    </g>
  );
}

function Pick({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M6 10h20l-2 4H8z" fill={fill} />
      <rect x="14.2" y="13" width="3.6" height="14" rx="1" fill="#c4924a" />
    </g>
  );
}
function Axe({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M8 8c8 0 12 3 12 7s-4 6-12 6l2-4h6c2 0 3-1 3-2s-1-2-3-2H10z" fill={fill} />
      <rect x="14" y="14" width="3.4" height="13" rx="1" fill="#c4924a" />
    </g>
  );
}
function Spade({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M16 6c5 4 6 8 4 12H12C10 14 11 10 16 6z" fill={fill} />
      <rect x="14.3" y="16" width="3.4" height="11" rx="1" fill="#c4924a" />
    </g>
  );
}
function Blade({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M16 4l4 16h-8z" fill={fill} />
      <rect x="12" y="20" width="8" height="3" fill="#d9dde2" />
      <rect x="14.5" y="23" width="3" height="5" fill="#c4924a" />
    </g>
  );
}
function Hoe({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M8 10h14v4H8z" fill={fill} />
      <rect x="18" y="12" width="3.2" height="14" rx="1" fill="#c4924a" />
    </g>
  );
}
function Bow({ fill }: { fill: string }) {
  return (
    <g fill="none" stroke={fill} strokeWidth="2.2">
      <path d="M10 6c8 4 8 16 0 20" />
      <path d="M10 6l12 10L10 26" stroke="#f4f1ea" />
    </g>
  );
}
function Cap({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M7 16c0-6 4-9 9-9s9 3 9 9v3H7z" fill={fill} />
      <rect x="6" y="18" width="20" height="3" rx="1" fill={fill} />
    </g>
  );
}
function Shell({ fill }: { fill: string }) {
  return <path d="M8 8h16v16l-4 3H12l-4-3z" fill={fill} />;
}
function Legs({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M8 8h16v6H8z" fill={fill} />
      <rect x="9" y="14" width="5" height="12" fill={fill} />
      <rect x="18" y="14" width="5" height="12" fill={fill} />
    </g>
  );
}
function Boots({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M7 14h8v8H6z" fill={fill} />
      <path d="M17 14h8v8h-9z" fill={fill} />
    </g>
  );
}
function Bite({ fill, meat, loaf }: { fill: string; meat: boolean; loaf: boolean }) {
  if (loaf) return <path d="M6 18c0-5 4-8 10-8s10 3 10 8v4H6z" fill={fill} />;
  if (meat) return <ellipse cx="16" cy="17" rx="9" ry="6" fill={fill} />;
  return (
    <g>
      <circle cx="16" cy="17" r="8" fill={fill} />
      <path d="M16 8c2 3 2 5 0 7" stroke="#3aaa4c" strokeWidth="2" />
    </g>
  );
}
function Drop({ fill }: { fill: string }) {
  return <path d="M16 5c6 7 8 10 8 14a8 8 0 1 1-16 0c0-4 2-7 8-14z" fill={fill} />;
}
function Sprout({ fill, bloom }: { fill: string; bloom: boolean }) {
  return (
    <g>
      <path d="M16 28V14" stroke="#2f7d3a" strokeWidth="2" />
      {bloom ? <circle cx="16" cy="12" r="5" fill={fill} /> : <path d="M16 18c-6-2-8-8-4-10 4 3 5 7 4 10zm0 0c6-2 8-8 4-10-4 3-5 7-4 10z" fill={fill} />}
    </g>
  );
}
function Pane({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="6" y="6" width="20" height="20" rx="2" fill={fill} opacity="0.85" />
      <rect x="6" y="6" width="20" height="20" fill="none" stroke="#f4fbff" strokeWidth="3" />
    </g>
  );
}
function Flame({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M16 4c4 6 8 8 8 14a8 8 0 1 1-16 0c0-4 2-6 4-9 0 3 2 4 4 2-1 2 0 3 0-7z" fill={fill} />
      <rect x="14" y="26" width="4" height="3" fill="#c4924a" />
    </g>
  );
}
function Door({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="9" y="5" width="14" height="22" rx="1" fill={fill} />
      <circle cx="19" cy="16" r="1.4" fill="#f5c518" />
    </g>
  );
}
function Crate({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M6 12l10-5 10 5v12l-10 5-10-5z" fill={fill} />
      <path d="M6 12l10 5 10-5" fill="none" stroke="#000" strokeOpacity="0.25" />
    </g>
  );
}
function Kiln({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="7" y="6" width="18" height="20" rx="2" fill={fill} />
      <rect x="11" y="14" width="10" height="8" fill="#1c140e" />
      <path d="M14 20c1-2 3-2 4 0" stroke="#f07820" strokeWidth="1.4" fill="none" />
    </g>
  );
}
function Bench({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="4" y="12" width="24" height="8" rx="1" fill={fill} />
      <circle cx="10" cy="10" r="2" fill={fill} />
      <circle cx="16" cy="10" r="2" fill={fill} />
      <circle cx="22" cy="10" r="2" fill={fill} />
    </g>
  );
}
function Bed({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="5" y="14" width="22" height="8" rx="2" fill={fill} />
      <rect x="5" y="10" width="7" height="8" fill="#f4f1ea" />
    </g>
  );
}
function Anvil({ fill }: { fill: string }) {
  return <path d="M6 12h20v4H8v6h6v3H10v-3H6z" fill={fill} />;
}
function Flask({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="13" y="4" width="6" height="6" fill="#d9dde2" />
      <path d="M13 10l-5 12a6 6 0 0 0 16 0L19 10z" fill={fill} />
    </g>
  );
}
function Dart({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M6 16h16" stroke="#c4924a" strokeWidth="2" />
      <path d="M20 16l6-4v8z" fill={fill} />
    </g>
  );
}
function Rod({ fill }: { fill: string }) {
  return <rect x="14" y="4" width="4" height="24" rx="2" fill={fill} />;
}
function Bar({ fill }: { fill: string }) {
  return <path d="M6 13h20l-2 8H8z" fill={fill} />;
}
function Pail({ fill }: { fill: string }) {
  return (
    <g>
      <path d="M9 12h14l-2 14H11z" fill={fill} />
      <path d="M11 12c1-5 9-5 10 0" fill="none" stroke="#1c140e" strokeWidth="1.6" />
    </g>
  );
}
function Gem({ fill }: { fill: string }) {
  return (
    <g>
      <rect x="6" y="14" width="20" height="12" rx="1" fill="#8e959c" />
      <path d="M16 6l6 8H10z" fill={fill} />
    </g>
  );
}
