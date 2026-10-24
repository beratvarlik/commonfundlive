"use client";

import Link from "next/link";
import { useId } from "react";

export function LogoMark({ size = 38 }: { size?: number }) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg width={size} height={(size * 52) / 64} viewBox="0 0 64 52" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset=".55" stopColor="#6366F1" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <path
        d="M32 33C36 27 40 24 47 24A9 9 0 0 1 47 42C40 42 36 39 32 33C28 27 24 24 17 24A9 9 0 0 0 17 42C24 42 28 39 32 33Z"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="9" r="6.5" fill="#8B5CF6" />
      <circle cx="15.5" cy="14" r="5.2" fill="#8B5CF6" />
      <circle cx="48.5" cy="14" r="5.2" fill="#06B6D4" />
    </svg>
  );
}

export function Logo({ size = 38 }: { size?: number }) {
  return (
    <Link href="/" aria-label="CommonFund ana sayfa" className="row" style={{ gap: 10, textDecoration: "none", minHeight: 44 }}>
      <LogoMark size={size} />
      <span className="wm">
        Common<b>Fund</b>
      </span>
    </Link>
  );
}
