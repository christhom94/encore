// Icons from the prototype. All decorative: the button around them carries the label.

type P = { size?: number };

const stroke = (width: number) => ({
  fill: "none",
  stroke: "currentColor",
  strokeWidth: width,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...stroke(2.4)} aria-hidden="true">
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...stroke(2.4)} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const HelpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...stroke(2.2)} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4M12 17h.01" />
  </svg>
);

export const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...stroke(2.4)} aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const PlayIcon = ({ size = 11 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);

export const PauseIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1.5" />
    <rect x="14" y="5" width="4" height="14" rx="1.5" />
  </svg>
);

export const LeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...stroke(2.8)} aria-hidden="true">
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const RightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...stroke(2.8)} aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const TickIcon = ({ color }: { color: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" {...stroke(3.6)} stroke={color} aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const CrossIcon = ({ color }: { color: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" {...stroke(3.6)} stroke={color} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
