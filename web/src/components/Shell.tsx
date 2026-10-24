"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { shortAddr } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { Logo } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

export type NavKey = "panel" | "kura" | "mazeret" | "dogrulama" | "kur" | "gruplar" | "katil";

const icons: Record<string, ReactNode> = {
  panel: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  kura: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" /><circle cx="12" cy="4" r="2" />
    </svg>
  ),
  mazeret: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  ),
  dogrulama: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" />
    </svg>
  ),
  kur: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  gruplar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 14.5c3 0 6 1.5 6 4.5" />
    </svg>
  ),
  katil: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    </svg>
  ),
};

type Props = {
  active: NavKey;
  groupId?: string;
  groupName?: string;
  groupMeta?: string;
  children: ReactNode;
};

export function Shell({ active, groupId, groupName, groupMeta, children }: Props) {
  const { account, connect, connecting, hasWallet } = useWallet();
  const [err, setErr] = useState<string | null>(null);

  const link = (key: NavKey, href: string, label: string) => (
    <Link key={key} className="nav-a" href={href} aria-current={active === key ? "page" : undefined}>
      {icons[key]}
      {label}
    </Link>
  );

  return (
    <div className="shell">
      <aside className="side" aria-label="Ana menü">
        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
          <Logo />
          <ThemeToggle />
        </div>
        {groupId && (
          <div className="card stack" style={{ padding: "12px 14px", borderRadius: 14, gap: 2 }}>
            <span style={{ fontSize: 12 }} className="muted">Grubun · davet kodu {groupId}</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{groupName || "Yükleniyor…"}</span>
            {groupMeta && <span style={{ fontSize: 13 }} className="muted">{groupMeta}</span>}
          </div>
        )}
        <nav aria-label="Menü">
          {groupId && link("panel", `/grup/${groupId}`, "Grup paneli")}
          {groupId && link("kura", `/grup/${groupId}/kura`, "Kura")}
          {groupId && link("mazeret", `/grup/${groupId}/mazeret`, "Mazeret ve kararlar")}
          {groupId && link("dogrulama", `/grup/${groupId}/dogrulama`, "Doğrulama")}
          {link("gruplar", "/gruplar", "Gruplarım")}
          {link("kur", "/kur", "Yeni grup kur")}
          {link("katil", "/katil", "Davet koduyla katıl")}
        </nav>
        <div className="foot stack" style={{ marginTop: "auto", gap: 8 }}>
          {account ? (
            <div className="stack" style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid var(--line)", gap: 4 }}>
              <span className="row muted" style={{ gap: 8, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)" }} />
                Cüzdan bağlı
              </span>
              <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>{shortAddr(account)}</span>
            </div>
          ) : (
            <>
              <button
                className="btn btn-p"
                type="button"
                disabled={connecting}
                onClick={async () => {
                  setErr(null);
                  try {
                    await connect();
                  } catch (e) {
                    setErr((e as Error).message);
                  }
                }}
              >
                {connecting ? "Bağlanıyor…" : "Cüzdanı bağla"}
              </button>
              {!hasWallet && <p className="muted" style={{ fontSize: 13 }}>Tarayıcında cüzdan yok. MetaMask kurup sayfayı yenile.</p>}
              {err && <p role="alert" style={{ fontSize: 13, color: "var(--late)" }}>{err}</p>}
            </>
          )}
        </div>
      </aside>
      <main className="main">
        <div className="wrap">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="wraprow" style={{ alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800 }}>{title}</h1>
        {sub && <p className="muted" style={{ fontSize: 16 }}>{sub}</p>}
      </div>
      {actions && <div className="wraprow" style={{ gap: 10 }}>{actions}</div>}
    </header>
  );
}
