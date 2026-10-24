"use client";

import Link from "next/link";
import { useState } from "react";
import { AGENTS, AgentAvatar, type AgentKey } from "@/components/Agent";
import { agentLog, describe, GroupFrame, ringMembers, useGroupPage } from "@/components/GroupKit";
import { PageHeader } from "@/components/Shell";
import { Ring } from "@/components/Ring";
import { TxLink } from "@/components/TxLink";
import { dateTime, duration, mon, shortAddr } from "@/lib/format";
import { sameAddr, Status, type GroupData } from "@/lib/group";
import { useNow } from "@/lib/useGroup";
import { useWallet } from "@/lib/wallet";

function MyRound({ d, refresh }: { d: GroupData; refresh: () => void }) {
  const { account, send } = useWallet();
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okHash, setOkHash] = useState<string | null>(null);
  const g = d.group;
  const me = d.members.find((m) => sameAddr(m.account, account));
  const late = !!me && !me.paid && now > g.deadline;
  const left = g.deadline - now;

  const pay = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { hash } = await send({ functionName: "payInstallment", args: [g.id], value: g.installment });
      setOkHash(hash);
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  let status: React.ReactNode;
  if (!account) status = "Kendi durumunu görmek için cüzdanını bağla.";
  else if (!me) status = "Bu grubun üyesi değilsin; yalnızca izleyebilirsin.";
  else if (me.paid) status = me.covered ? "Bu turun taksidin teminatından karşılandı." : "Bu turun taksidin ödendi.";
  else if (me.extendedUntil) status = `Muhtar sana ${dateTime(me.extendedUntil)} tarihine kadar süre verdi.`;
  else if (late) status = "Son ödeme günü geçti. Taksidini öde ya da mazeretini yaz.";
  else status = `Taksidini ödemek için ${duration(left)} var.`;

  return (
    <section className="card card-pad stack" aria-labelledby="bu-tur" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <h2 id="bu-tur" style={{ fontSize: 19, fontWeight: 700 }}>Bu tur</h2>
        <span className="muted num" style={{ fontSize: 14 }}>{g.paidCount} / {g.size} taksit geldi</span>
      </div>
      <div className="progress" role="progressbar" aria-label="Gelen taksitler" aria-valuemin={0} aria-valuemax={g.size} aria-valuenow={g.paidCount}>
        <div style={{ width: `${(g.paidCount / g.size) * 100}%` }} />
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.55 }}>{status}</p>
      <p className="muted" style={{ fontSize: 14 }}>Son ödeme: {dateTime(g.deadline)} · Havuz şu an {mon(g.pot)}</p>
      <div className="wraprow" style={{ gap: 10 }}>
        {me && !me.paid && (
          <button className="btn btn-p" type="button" disabled={busy} onClick={pay}>
            {busy ? "Ödeniyor…" : `Taksidi öde · ${mon(g.installment)}`}
          </button>
        )}
        {late && !me?.excuse && <Link className="btn btn-g" href={`/grup/${g.id}/mazeret`}>Mazeret yaz</Link>}
        {g.paidCount === g.size && <Link className="btn btn-p" href={`/grup/${g.id}/kura`}>Kura çek</Link>}
      </div>
      {okHash && <p className="alert alert-ok">Taksidin kasaya ulaştı. Kayıt: <TxLink hash={okHash} /></p>}
      {err && <p role="alert" className="alert alert-err">{err}</p>}
    </section>
  );
}

function Forming({ d }: { d: GroupData }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/katil?kod=${d.group.id}` : "";
  return (
    <section className="card card-pad stack" style={{ gap: 12 }}>
      <h2 style={{ fontSize: 19, fontWeight: 700 }}>Üyeler bekleniyor</h2>
      <p style={{ fontSize: 15 }}>{d.group.members.length} / {d.group.size} kişi teminatını yatırdı. Herkes katılınca ilk tur kendiliğinden başlar.</p>
      <p className="muted" style={{ fontSize: 14 }}>Davet kodu: <strong className="num">{d.group.id.toString()}</strong></p>
      <div className="wraprow" style={{ gap: 10 }}>
        <button
          className="btn btn-p"
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Bağlantı kopyalandı" : "Davet bağlantısını kopyala"}
        </button>
      </div>
    </section>
  );
}

function Helpers({ d }: { d: GroupData }) {
  const [open, setOpen] = useState<AgentKey>("bekci");
  const a = AGENTS[open];
  return (
    <section className="card card-pad stack" aria-labelledby="yardimci" style={{ gap: 16 }}>
      <h2 id="yardimci" style={{ fontSize: 19, fontWeight: 700 }}>Yardımcılar</h2>
      <div className="wraprow" style={{ gap: 10 }}>
        {(["katip", "bekci", "muhtar"] as AgentKey[]).map((k) => (
          <button key={k} className={`agent-btn ${AGENTS[k].cls}`} type="button" aria-expanded={open === k} aria-controls="ne-yaptim" onClick={() => setOpen(k)}>
            <AgentAvatar agent={k} size={36} />
            {AGENTS[k].name}
          </button>
        ))}
      </div>
      <div id="ne-yaptim" className="stack" style={{ padding: "16px 18px", borderRadius: 14, background: "var(--bg)", border: `1.5px solid ${a.color}`, gap: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: a.color }}>{a.name} · ne yaptım</p>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, fontSize: 15, lineHeight: 1.5 }}>
          {agentLog(open, d).map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        {open === "muhtar" && <Link href={`/grup/${d.group.id}/mazeret`} style={{ fontSize: 14, fontWeight: 600 }}>Mazeret ve kararları gör</Link>}
      </div>
    </section>
  );
}

export default function PanelPage() {
  const page = useGroupPage();
  const { account } = useWallet();
  return (
    <GroupFrame active="panel" page={page}>
      {(d) => {
        const g = d.group;
        const waiting = d.members.filter((m) => !m.received).map((m) => m.nickname);
        return (
          <>
            <PageHeader
              title={g.name}
              sub={
                g.status === Status.Active
                  ? `${g.round}. tur / ${g.size} · son ödeme ${dateTime(g.deadline)}`
                  : g.status === Status.Forming
                    ? "Üyeler katılıyor"
                    : "Grup tamamlandı; herkes havuzu bir kez aldı"
              }
              actions={
                <>
                  <Link className="btn btn-g" href={`/grup/${g.id}/dogrulama`}>Kasayı doğrula</Link>
                  {g.status === Status.Active && <Link className="btn btn-p" href={`/grup/${g.id}/kura`}>Kura ekranı</Link>}
                </>
              }
            />

            <div className="cols" style={{ alignItems: "stretch" }}>
              <section className="card card-pad stack" aria-labelledby="halka" style={{ flex: "1 1 440px", minWidth: 0, gap: 18 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <h2 id="halka" style={{ fontSize: 19, fontWeight: 700 }}>Halka</h2>
                  {g.status === Status.Active && <span className="muted" style={{ fontSize: 14 }}>Sıradakiler: {waiting.join(", ")}</span>}
                </div>
                <Ring
                  members={ringMembers(d, account)}
                  ariaLabel={`${g.size} üyeli halka. ${g.paidCount} üye bu tur ödedi. Havuzda ${mon(g.pot)} var.`}
                  center={
                    <>
                      <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Bu turun havuzu</span>
                      <span className="disp num" style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{mon(g.pot, false)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--got)" }}>/ {mon(g.installment * BigInt(g.size))}</span>
                    </>
                  }
                />
                <ul aria-label="Halka göstergeleri" className="wraprow muted" style={{ listStyle: "none", margin: 0, padding: 0, gap: "8px 18px", fontSize: 13, justifyContent: "center" }}>
                  <li className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--ok)" }} />Bu tur ödedi</li>
                  <li className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--got-soft)", border: "2px solid var(--purple)" }} />Havuzu aldı</li>
                  <li className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px dashed var(--late)" }} />Gecikti</li>
                </ul>
              </section>

              <div className="stack" style={{ flex: "1 1 440px", minWidth: 0, gap: 24 }}>
                {g.status === Status.Forming ? <Forming d={d} /> : g.status === Status.Active ? <MyRound d={d} refresh={page.refresh} /> : (
                  <section className="card card-pad stack" style={{ gap: 10 }}>
                    <h2 style={{ fontSize: 19, fontWeight: 700 }}>Grup tamamlandı</h2>
                    <p style={{ fontSize: 15 }}>Herkes havuzu bir kez aldı. Kalan teminatını Doğrulama sayfasından geri alabilirsin.</p>
                    <Link className="btn btn-p" href={`/grup/${g.id}/dogrulama`}>Teminatımı geri al</Link>
                  </section>
                )}
                <Helpers d={d} />
              </div>
            </div>

            <section className="card card-pad stack" aria-labelledby="uyeler" style={{ gap: 14 }}>
              <h2 id="uyeler" style={{ fontSize: 19, fontWeight: 700 }}>Üyeler</h2>
              <div className="tbl-box">
                <table className="tbl">
                  <thead>
                    <tr><th scope="col">Üye</th><th scope="col">Teminat</th><th scope="col">Bu tur</th><th scope="col">Havuz</th><th scope="col">Cüzdan</th></tr>
                  </thead>
                  <tbody>
                    {d.members.map((m) => {
                      const late = g.status === Status.Active && !m.paid && Date.now() / 1000 > g.deadline;
                      return (
                        <tr key={m.account}>
                          <th scope="row">{m.nickname} {sameAddr(m.account, account) && <span className="muted" style={{ fontWeight: 500 }}>(sen)</span>}</th>
                          <td className="num">{mon(m.collateralLeft)}</td>
                          <td>
                            {g.status !== Status.Active ? <span className="pill pill-wait">—</span>
                              : m.paid ? <span className={`pill ${m.covered ? "pill-warn" : "pill-ok"}`}>{m.covered ? "Teminattan" : "Ödedi"}</span>
                              : m.extendedUntil ? <span className="pill pill-late">Süre: {dateTime(m.extendedUntil)}</span>
                              : late ? <span className="pill pill-late">Gecikti</span>
                              : <span className="pill pill-wait">Bekleniyor</span>}
                          </td>
                          <td>{m.received ? <span className="pill pill-got">Aldı · {m.receivedRound}. tur</span> : <span className="pill pill-wait">Sırada</span>}</td>
                          <td className="muted num">{shortAddr(m.account)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card card-pad stack" aria-labelledby="gecmis" style={{ gap: 14 }}>
              <h2 id="gecmis" style={{ fontSize: 19, fontWeight: 700 }}>İşlem geçmişi</h2>
              {d.activities.length === 0 ? (
                <p className="muted">Henüz işlem yok. İlk taksitler geldikçe burada görünür.</p>
              ) : (
                <div className="tbl-box">
                  <table className="tbl">
                    <thead><tr><th scope="col">Tarih</th><th scope="col">İşlem</th><th scope="col">Tutar</th><th scope="col">Kayıt</th></tr></thead>
                    <tbody>
                      {d.activities.slice(0, 15).map((a) => {
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
              )}
            </section>
          </>
        );
      }}
    </GroupFrame>
  );
}
