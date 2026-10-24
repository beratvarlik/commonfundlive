"use client";

import { useState } from "react";
import { AgentAvatar } from "@/components/Agent";
import { describe, GroupFrame, useGroupPage } from "@/components/GroupKit";
import { PageHeader } from "@/components/Shell";
import { TxLink } from "@/components/TxLink";
import { addressUrl, CONTRACT_ADDRESS } from "@/lib/chain";
import { dateTime, duration, mon, shortAddr } from "@/lib/format";
import { sameAddr, Status, type GroupData } from "@/lib/group";
import { useWallet } from "@/lib/wallet";

const yes = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 3 }}>
    <path d="M5 12l5 5L19 7" />
  </svg>
);
const no = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--late)" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" style={{ flex: "none", marginTop: 3 }}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

function Body({ d, refresh }: { d: GroupData; refresh: () => void }) {
  const { account, send } = useWallet();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okHash, setOkHash] = useState<string | null>(null);
  const g = d.group;
  const collateralTotal = d.members.reduce((s, m) => s + m.collateralLeft, 0n);
  const me = d.members.find((m) => sameAddr(m.account, account));
  const groups = (a: string) => <a href={addressUrl(a)} target="_blank" rel="noopener noreferrer" className="num">{shortAddr(a)}</a>;

  const withdraw = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { hash } = await send({ functionName: "withdrawCollateral", args: [g.id] });
      setOkHash(hash);
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Doğrulama" sub="Paran nerede duruyor, kim neye dokunabilir? Hepsini kendin kontrol edebilirsin." />
      <div className="cols">
        <div className="stack" style={{ flex: "1 1 440px", minWidth: 0, gap: 24 }}>
          <section className="card card-pad stack glow" aria-labelledby="kasa" style={{ gap: 16 }}>
            <div className="wraprow" style={{ justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <h2 id="kasa" style={{ fontSize: 19, fontWeight: 700 }}>Kasa adresi</h2>
              <span className="pill pill-wait">Monad deneme ağı</span>
            </div>
            <p className="num" style={{ fontSize: 16, lineHeight: 1.6, letterSpacing: ".03em", wordBreak: "break-all", padding: "14px 16px", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--line)" }}>
              {CONTRACT_ADDRESS}
            </p>
            <div className="wraprow" style={{ gap: 10 }}>
              <button
                className="btn btn-g"
                type="button"
                style={{ flex: "1 1 160px" }}
                aria-live="polite"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(CONTRACT_ADDRESS);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setErr("Kopyalanamadı; adresi elle seçip kopyala.");
                  }
                }}
              >
                {copied ? "Kopyalandı" : "Adresi kopyala"}
              </button>
              <a className="btn btn-p" style={{ flex: "1 1 160px" }} href={addressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer">Kasayı incele</a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px,100%),1fr))", gap: 12, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <div className="stack" style={{ gap: 2 }}>
                <span className="muted" style={{ fontSize: 13 }}>Bu turun havuzu</span>
                <span className="disp num" style={{ fontSize: 28, fontWeight: 800 }}>{mon(g.pot)}</span>
              </div>
              <div className="stack" style={{ gap: 2 }}>
                <span className="muted" style={{ fontSize: 13 }}>Teminatlar</span>
                <span className="disp num" style={{ fontSize: 28, fontWeight: 800 }}>{mon(collateralTotal)}</span>
              </div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.55 }}>
              Bu adresteki kod parayı yalnızca iki yere gönderebilir: kurayı kazanana ve grup bitince teminat sahiplerine. CommonFund ekibi dahil hiç kimse parayı çekemez.
            </p>
            {g.status === Status.Completed && me && !me.withdrawn && (
              <button className="btn btn-p" type="button" disabled={busy || me.collateralLeft === 0n} onClick={withdraw}>
                {busy ? "Gönderiliyor…" : `Teminatımı geri al · ${mon(me.collateralLeft)}`}
              </button>
            )}
            {okHash && <p className="alert alert-ok">Teminatın cüzdanına gönderildi. Kayıt: <TxLink hash={okHash} /></p>}
            {err && <p role="alert" className="alert alert-err">{err}</p>}
          </section>

          <section className="card card-pad stack" aria-labelledby="kurallar" style={{ gap: 10 }}>
            <h2 id="kurallar" style={{ fontSize: 19, fontWeight: 700 }}>Sabit kurallar</h2>
            <dl className="dl">
              <div><dt>Tur başı taksit</dt><dd>{mon(g.installment)}</dd></div>
              <div><dt>Teminat</dt><dd>{mon(g.collateral)}</dd></div>
              <div><dt>Son ödeme</dt><dd>Tur başından {duration(g.payWindow)} sonra</dd></div>
              <div><dt>Turlar arası</dt><dd>{duration(g.period)}</dd></div>
              <div><dt>Muhtar adresi</dt><dd>{groups(d.muhtar)}</dd></div>
              <div><dt>Bekçi adresi</dt><dd>{groups(d.bekci)}</dd></div>
            </dl>
          </section>
        </div>

        <section className="card card-pad stack" aria-labelledby="muhtar-yetki" style={{ flex: "1 1 440px", minWidth: 0, gap: 18, borderColor: "var(--purple)" }}>
          <div className="row" style={{ gap: 12 }}>
            <AgentAvatar agent="muhtar" size={48} />
            <div className="stack" style={{ gap: 2 }}>
              <h2 id="muhtar-yetki" style={{ fontSize: 19, fontWeight: 700 }}>Muhtar&apos;ın yetkileri</h2>
              <span className="muted" style={{ fontSize: 13 }}>Kasa sözleşmesine yazılı, değiştirilemez</span>
            </div>
          </div>
          <div className="stack" style={{ gap: 12, padding: 16, borderRadius: 14, background: "var(--ok-soft)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ok)" }}>Yapabilir</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 15, lineHeight: 1.5 }}>
              <li className="row" style={{ gap: 10, alignItems: "flex-start" }}>{yes}Mazeret yazmış üyeye en fazla {duration(g.maxExtension)} ek süre vermek</li>
              <li className="row" style={{ gap: 10, alignItems: "flex-start" }}>{yes}Teminattan en fazla bir taksit tutarını kesip o turun havuzuna eklemek</li>
              <li className="row" style={{ gap: 10, alignItems: "flex-start" }}>{yes}Her kararını gerekçesiyle kayda yazmak</li>
            </ul>
          </div>
          <div className="stack" style={{ gap: 12, padding: 16, borderRadius: 14, background: "var(--late-soft)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--late)" }}>Yapamaz</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 15, lineHeight: 1.5 }}>
              <li className="row" style={{ gap: 10, alignItems: "flex-start" }}>{no}Havuzdaki parayı kendine ya da birine göndermek</li>
              <li className="row" style={{ gap: 10, alignItems: "flex-start" }}>{no}Kurayı çekmek ya da sonucunu değiştirmek</li>
              <li className="row" style={{ gap: 10, alignItems: "flex-start" }}>{no}Taksit tutarını, tarihleri ya da üye listesini değiştirmek</li>
              <li className="row" style={{ gap: 10, alignItems: "flex-start" }}>{no}Mazeret yazmamış bir üye için karar vermek</li>
            </ul>
          </div>
          <div className="stack" style={{ gap: 10, paddingTop: 6 }}>
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <AgentAvatar agent="katip" size={32} />
              <p style={{ fontSize: 14, lineHeight: 1.5 }}><strong className="c-katip">Kâtip</strong> kuralları özetler; kasada hiçbir yetkisi yoktur, grubu sen onaylarsın.</p>
            </div>
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <AgentAvatar agent="bekci" size={32} />
              <p style={{ fontSize: 14, lineHeight: 1.5 }}><strong className="c-bekci">Bekçi</strong> yalnızca gecikmeyi işaretleyip mesaj bırakabilir; süre dolunca herkesin uygulayabildiği kuralı çalıştırır.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="card card-pad stack" aria-labelledby="son" style={{ gap: 14 }}>
        <h2 id="son" style={{ fontSize: 19, fontWeight: 700 }}>Son işlemler</h2>
        <div className="tbl-box">
          <table className="tbl">
            <thead><tr><th scope="col">Tarih</th><th scope="col">İşlem</th><th scope="col">Tutar</th><th scope="col">Kayıt</th></tr></thead>
            <tbody>
              {d.activities.slice(0, 10).map((a) => {
                const l = describe(a, d);
                return (
                  <tr key={a.index}>
                    <td className="muted">{dateTime(a.time)}</td>
                    <td style={{ whiteSpace: "normal", minWidth: 240 }}>{l.text}</td>
                    <td className="num">{l.amount ?? "—"}</td>
                    <td><TxLink hash={a.txHash} label={l.text} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function DogrulamaPage() {
  const page = useGroupPage();
  return <GroupFrame active="dogrulama" page={page}>{(d) => <Body d={d} refresh={page.refresh} />}</GroupFrame>;
}
