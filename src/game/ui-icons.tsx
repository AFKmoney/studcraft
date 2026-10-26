import type { ReactNode, SVGProps } from "react";

// Studcraft UI glyphs — chunky, rounded, two-tone so they read on any
// background at 14–28 px. No external icon font or package.

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const HeartIcon = ({ level = 1, ...p }: P & { level?: 0 | 0.5 | 1 }) => (
  <Svg {...p}>
    <path d="M12 21s-7.6-4.7-9.3-9.6C1.5 7.9 3.6 4.5 7.1 4.5c2 0 3.5 1.1 4.9 2.9 1.4-1.8 2.9-2.9 4.9-2.9 3.5 0 5.6 3.4 4.4 6.9C19.6 16.3 12 21 12 21z" fill="rgba(0,0,0,0.45)" />
    <path d="M12 19.4s-6.4-4-7.9-8.2C3.2 8.4 4.8 6 7.3 6c1.8 0 3 1 4.7 3.1C13.7 7 14.9 6 16.7 6c2.5 0 4.1 2.4 3.2 5.2C18.4 15.4 12 19.4 12 19.4z" fill="rgba(255,255,255,0.08)" />
    {level > 0 && (
      <g clipPath={level === 0.5 ? "url(#half-l)" : undefined}>
        <defs>
          <clipPath id="half-l">
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
        <path d="M12 19.4s-6.4-4-7.9-8.2C3.2 8.4 4.8 6 7.3 6c1.8 0 3 1 4.7 3.1C13.7 7 14.9 6 16.7 6c2.5 0 4.1 2.4 3.2 5.2C18.4 15.4 12 19.4 12 19.4z" fill="#e8402f" />
        <path d="M7.4 8.2c-1 0-1.8.8-1.8 1.9" stroke="#ffb4a6" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
    )}
  </Svg>
);

export const FoodIcon = ({ level = 1, ...p }: P & { level?: 0 | 0.5 | 1 }) => (
  <Svg {...p}>
    <g transform="rotate(-40 12 12)">
      <ellipse cx="12" cy="8.6" rx="6.6" ry="5.6" fill="rgba(0,0,0,0.45)" />
      <rect x="10.2" y="12" width="3.6" height="7" rx="1.4" fill="rgba(0,0,0,0.45)" />
      {level > 0 && (
        <g clipPath={level === 0.5 ? "url(#half-r)" : undefined}>
          <rect x="10.6" y="12.4" width="2.8" height="6.4" rx="1.2" fill="#f2ead8" />
          <circle cx="10.4" cy="19.4" r="1.7" fill="#f2ead8" />
          <circle cx="13.6" cy="19.4" r="1.7" fill="#f2ead8" />
          <ellipse cx="12" cy="8.6" rx="5.6" ry="4.7" fill="#c46a2c" />
          <ellipse cx="12" cy="9.6" rx="5" ry="3.4" fill="#9a4a1c" />
          <ellipse cx="10.4" cy="6.8" rx="2.2" ry="1.3" fill="#e9a066" />
        </g>
      )}
    </g>
  </Svg>
);

export const BubbleIcon = ({ on = true, ...p }: P & { on?: boolean }) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="7.5" fill={on ? "#7cc7ff" : "rgba(0,0,0,0.35)"} stroke={on ? "#d8f0ff" : "rgba(255,255,255,0.15)"} strokeWidth="1.6" />
    {on && <circle cx="9.4" cy="9.3" r="2" fill="#ffffff" opacity="0.85" />}
  </Svg>
);

export const ShieldIcon = ({ level = 1, ...p }: P & { level?: 0 | 0.5 | 1 }) => (
  <Svg {...p}>
    <path d="M12 2.8 19.6 5.6v6c0 4.6-3.2 8-7.6 9.6-4.4-1.6-7.6-5-7.6-9.6v-6z" fill="rgba(0,0,0,0.45)" />
    {level > 0 && (
      <path d="M12 4.6 18 6.8v4.8c0 3.6-2.5 6.3-6 7.7-3.5-1.4-6-4.1-6-7.7V6.8z" fill="#b9c4cf" clipPath={level === 0.5 ? "url(#half-l)" : undefined} />
    )}
  </Svg>
);

export const PlayIcon = (p: P) => (
  <Svg {...p}>
    <path d="M8 5.2v13.6c0 .9 1 1.4 1.7.9l10-6.8c.6-.4.6-1.4 0-1.8l-10-6.8C9 3.8 8 4.3 8 5.2z" fill="currentColor" />
  </Svg>
);
export const PauseIcon = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" />
    <rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" />
  </Svg>
);
export const GearIcon = (p: P) => (
  <Svg {...p}>
    <path
      d="M10.3 2.5h3.4l.5 2.6 1.6.9 2.5-.9 1.7 2.9-2 1.8v1.9l2 1.8-1.7 2.9-2.5-.9-1.6.9-.5 2.6h-3.4l-.5-2.6-1.6-.9-2.5.9-1.7-2.9 2-1.8v-1.9l-2-1.8 1.7-2.9 2.5.9 1.6-.9z"
      fill="currentColor"
    />
    <circle cx="12" cy="11.9" r="3.1" fill="var(--icon-hole, #1c140e)" />
  </Svg>
);
export const BagIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 6.2V5.4a3 3 0 0 1 6 0v.8" {...stroke} strokeWidth={2} />
    <path d="M5.2 10.2A4 4 0 0 1 9.2 6.2h5.6a4 4 0 0 1 4 4v8.6a2 2 0 0 1-2 2H7.2a2 2 0 0 1-2-2z" fill="currentColor" />
    <path d="M5.4 11.4c2 1.4 4.2 2 6.6 2s4.6-.6 6.6-2" stroke="var(--icon-hole, #1c140e)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <rect x="8.6" y="15" width="6.8" height="3.6" rx="1.2" fill="var(--icon-hole, #1c140e)" />
  </Svg>
);
export const GlobeIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" {...stroke} />
    <path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6S14.4 18.2 12 20.6M12 3.4C9.6 5.8 8.4 8.7 8.4 12s1.2 6.2 3.6 8.6" {...stroke} strokeWidth={1.8} />
  </Svg>
);
export const CopyIcon = (p: P) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.4" {...stroke} />
    <path d="M15.5 5.5v-.4a1.6 1.6 0 0 0-1.6-1.6H6.1a1.6 1.6 0 0 0-1.6 1.6v7.8a1.6 1.6 0 0 0 1.6 1.6h.4" {...stroke} />
  </Svg>
);
export const ExitIcon = (p: P) => (
  <Svg {...p}>
    <path d="M14 4.5h3.4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14" {...stroke} />
    <path d="M10.5 8 6.5 12l4 4M6.8 12h8.4" {...stroke} />
  </Svg>
);
export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...stroke} strokeWidth={2.8} />
  </Svg>
);
export const BackIcon = (p: P) => (
  <Svg {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" {...stroke} strokeWidth={2.8} />
  </Svg>
);
export const DiceIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="currentColor" />
    <g fill="var(--icon-hole, #1c140e)">
      <circle cx="8.3" cy="8.3" r="1.6" />
      <circle cx="15.7" cy="8.3" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="8.3" cy="15.7" r="1.6" />
      <circle cx="15.7" cy="15.7" r="1.6" />
    </g>
  </Svg>
);
export const TrashIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.5-1.3 1.2-1.3h2.6c.7 0 1.2.6 1.2 1.3v1.7" {...stroke} />
    <path d="M6.5 6.5 7.4 19a1.7 1.7 0 0 0 1.7 1.5h5.8a1.7 1.7 0 0 0 1.7-1.5l.9-12.5" {...stroke} />
  </Svg>
);
export const PickIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 7.2C7.6 3.9 12.8 3 17.4 4.7l1.9 1.9C17 6.1 14.4 6.4 12 7.6" {...stroke} />
    <path d="M11.2 9.8 4.4 19.6" {...stroke} strokeWidth={3.2} />
  </Svg>
);
export const HandIcon = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="9" width="14" height="11.5" rx="2.2" fill="currentColor" />
    <g fill="currentColor">
      <rect x="6.2" y="5.6" width="3.6" height="3.8" rx="1.2" />
      <rect x="10.2" y="5.6" width="3.6" height="3.8" rx="1.2" />
      <rect x="14.2" y="5.6" width="3.6" height="3.8" rx="1.2" />
    </g>
  </Svg>
);
export const JumpIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 19.5V6.5M6.5 11.5 12 5.5l5.5 6" {...stroke} strokeWidth={3} />
  </Svg>
);
export const SneakIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 4.5v13M6.5 12.5 12 18.5l5.5-6" {...stroke} strokeWidth={3} />
  </Svg>
);
export const SoundIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.5h3.4L12 5.6v12.8l-4.6-3.9H4z" fill="currentColor" />
    <path d="M15.3 9.2a4 4 0 0 1 0 5.6M17.8 6.7a7.6 7.6 0 0 1 0 10.6" {...stroke} strokeWidth={2} />
  </Svg>
);
export const EyeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12z" {...stroke} />
    <circle cx="12" cy="12" r="2.8" fill="currentColor" />
  </Svg>
);
export const ControllerIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7 7.5h10a4.5 4.5 0 0 1 4.3 5.7l-1 3.6a2.4 2.4 0 0 1-4.1 1L14.4 16H9.6l-1.8 1.8a2.4 2.4 0 0 1-4.1-1l-1-3.6A4.5 4.5 0 0 1 7 7.5z" fill="currentColor" />
    <path d="M7.6 10.4v3.2M6 12h3.2" stroke="var(--icon-hole, #1c140e)" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="15.6" cy="11" r="1.1" fill="var(--icon-hole, #1c140e)" />
    <circle cx="17.6" cy="13" r="1.1" fill="var(--icon-hole, #1c140e)" />
  </Svg>
);
export const BookIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 5.5c2.6-.9 5.1-.6 7.5.9v13c-2.4-1.5-4.9-1.8-7.5-.9zM19.5 5.5c-2.6-.9-5.1-.6-7.5.9v13c2.4-1.5 4.9-1.8 7.5-.9z" fill="currentColor" />
  </Svg>
);
export const StarIcon = (p: P) => (
  <Svg {...p}>
    <path d="m12 3.2 2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z" fill="currentColor" />
  </Svg>
);
export const ScrollIcon = (p: P) => (
  <Svg {...p}>
    <rect x="5.5" y="4.5" width="13" height="16" rx="2.4" fill="currentColor" />
    <rect x="8.8" y="2.8" width="6.4" height="3.6" rx="1.2" fill="currentColor" stroke="var(--icon-hole, #1c140e)" strokeWidth="1.2" />
    <path d="M8.6 10.2h6.8M8.6 13.4h6.8M8.6 16.6h4.4" stroke="var(--icon-hole, #1c140e)" strokeWidth="1.7" strokeLinecap="round" />
  </Svg>
);
export const MedalIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7.5 2.8h3.2L12 6.4l1.3-3.6h3.2l-2.4 6.3H9.9z" fill="currentColor" opacity="0.7" />
    <circle cx="12" cy="15" r="6.2" fill="currentColor" />
    <path d="m12 11.6 1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" fill="var(--icon-hole, #1c140e)" />
  </Svg>
);
export const HammerIcon = (p: P) => (
  <Svg {...p}>
    <path d="M13.2 3.6 20.4 10.8l-2.6 2.6-2.4-2.4-1.5 1.5L7 19.4a2.2 2.2 0 0 1-3.1-3.1l6.9-6.9 1.5-1.5-1.7-1.7z" fill="currentColor" />
  </Svg>
);
export const SunIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.4" fill="currentColor" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" {...stroke} strokeWidth={2} />
  </Svg>
);
export const MoonIcon = (p: P) => (
  <Svg {...p}>
    <path d="M19.6 14.8A8 8 0 0 1 9.2 4.4a8 8 0 1 0 10.4 10.4z" fill="currentColor" />
  </Svg>
);
export const RainIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7 15.5a4.5 4.5 0 0 1-.6-9 5.6 5.6 0 0 1 10.7 1.6A3.7 3.7 0 0 1 17 15.5z" fill="currentColor" />
    <path d="M8.5 18.5l-1 2M12.5 18.5l-1 2M16.5 18.5l-1 2" {...stroke} strokeWidth={2} />
  </Svg>
);
export const CloudIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7 18a4.6 4.6 0 0 1-.6-9.2 5.7 5.7 0 0 1 10.9 1.6A3.8 3.8 0 0 1 17 18z" fill="currentColor" />
  </Svg>
);
export const BoltIcon = (p: P) => (
  <Svg {...p}>
    <path d="M13.5 2.5 5.5 13.5h5l-1 8 8-11h-5z" fill="currentColor" />
  </Svg>
);
export const CheckIcon = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" {...stroke} strokeWidth={3} />
  </Svg>
);
export const LockIcon = (p: P) => (
  <Svg {...p}>
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...stroke} />
    <rect x="5.5" y="10.5" width="13" height="10" rx="2.4" fill="currentColor" />
  </Svg>
);
export const PlusIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" {...stroke} strokeWidth={3} />
  </Svg>
);
