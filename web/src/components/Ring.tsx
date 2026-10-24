import type { CSSProperties, ReactNode } from "react";

export type RingMember = {
  label: string;
  initial: string;
  state: "idle" | "paid" | "got" | "late" | "out" | "win" | "empty";
  badge?: boolean;
};

type Props = {
  members: RingMember[];
  center: ReactNode;
  orbit?: "none" | "live" | "spin" | "land";
  landIndex?: number;
  coinTo?: number | null;
  size?: number;
  ariaLabel: string;
};

function geometry(n: number, i: number) {
  const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
  return { cos: Math.cos(a), sin: Math.sin(a) };
}

export function Ring({ members, center, orbit = "none", landIndex = 0, coinTo = null, size = 420, ariaLabel }: Props) {
  const n = Math.max(members.length, 1);
  const s = n <= 6 ? 17.14 : Math.max(10, (17.14 * 6) / n);
  const land = 3 * 360 + (landIndex * 360) / n;
  const coin = coinTo !== null && coinTo !== undefined ? geometry(n, coinTo) : null;

  return (
    <div className="ring" role="img" aria-label={ariaLabel} style={{ ["--ring-size" as string]: `${size}px` } as CSSProperties}>
      <div className="ring-line" />
      {orbit !== "none" && (
        <div className={`orbit ${orbit}`} style={{ ["--land" as string]: `${land}deg` } as CSSProperties}>
          <div className="orbit-dot" />
        </div>
      )}
      {members.map((m, i) => {
        const g = geometry(n, i);
        const left = 50 + 40 * g.cos - s / 2;
        const top = 50 + 40 * g.sin - s / 2;
        return (
          <div key={i} className={`node ${m.state}`} style={{ left: `${left}%`, top: `${top}%`, width: `${s}%`, height: `${s}%` }}>
            {m.initial}
            <span className="nl">{m.label}</span>
            {m.badge && (
              <span className="bd">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 7v6M12 17v.5" />
                </svg>
              </span>
            )}
          </div>
        );
      })}
      <div className="ring-core">{center}</div>
      {coin && (
        <div
          key={`coin-${coinTo}`}
          className="coin fly"
          style={{ ["--tx" as string]: `${((40 * coin.cos) / 13.33) * 100}%`, ["--ty" as string]: `${((40 * coin.sin) / 13.33) * 100}%` } as CSSProperties}
        />
      )}
    </div>
  );
}
