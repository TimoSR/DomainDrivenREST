interface IconProps {
  size?: number;
  color?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
});

export function Logo({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 7.6 16.4 12 12 16.4 7.6 12z" stroke="var(--accent-2)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function Search({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Chevron({ size = 12, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="m6 9 6 6 6-6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRight({ size = 12, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="m9 6 6 6-6 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="m8 12.3 2.6 2.6L16 9.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Warning({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M12 7.5v5.2M12 16.3v.2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Close({ size = 13, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Clock({ size = 13, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function Copy({ size = 13, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke={color} strokeWidth="1.8" />
      <path d="M5 15V6a1 1 0 0 1 1-1h9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Braces({ size = 12, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path
        d="M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Aggregate({ size = 13, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="4" y="4" width="16" height="16" rx="3.5" stroke={color} strokeWidth="1.7" />
      <path d="M8.5 10h7M8.5 14h4" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** A transport contract: a document moving across the wire, not a thing in the domain. */
export function Dto({ size = 13, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path
        d="M6.5 3.5h7.2L18.5 8v12.5h-12z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M13.4 3.6V8.3h4.8M9.3 12.5h6M9.3 16h3.6" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ValueObject({ size = 13, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function EnumIcon({ size = 13, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3" fill={color} />
    </svg>
  );
}

export function Sparkle({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path
        d="M12 3.5 13.9 9 19.5 11 13.9 13 12 18.5 10.1 13 4.5 11 10.1 9z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sun({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="4.2" stroke={color} strokeWidth="1.7" />
      <path
        d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Moon({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path
        d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Refresh({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 4v4.5h-4.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Arrow({ size = 15, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 12h13M12 6l6 6-6 6" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
