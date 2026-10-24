"use client";

import { useState } from "react";
import { AgentLabel } from "@/components/Agent";
import { GroupFrame, useGroupPage } from "@/components/GroupKit";
import { PageHeader } from "@/components/Shell";
import { TxLink } from "@/components/TxLink";
import { dateTime, mon } from "@/lib/format";
import { Kind, sameAddr, Status, type ActivityInfo, type GroupData, type MemberInfo } from "@/lib/group";
import { useNow } from "@/lib/useGroup";
import { useWallet } from "@/lib/wallet";

const THREAD_KINDS = [Kind.Flagged, Kind.Excuse, Kind.Extension, Kind.Slashed, Kind.AutoSlashed];

function parseReason(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const reasons = lines.filter((l) => l.startsWith("•")).map((l) => l.replace(/^•\s*/, ""));
  const nextLine = lines.find((l) => l.startsWith("Bundan sonra:"));
  const sourceLine = lines.find((l) => l.startsWith("Kaynak:"));
  const source = sourceLine ? sourceLine.replace("Kaynak:", "").trim() : "";
  return { reasons, next: nextLine ? nextLine.replace("Bundan sonra:", "").trim() : "", source };
}

function Thread({ items, d, member }: { items: ActivityInfo[]; d: GroupData; member: MemberInfo }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 18 }}>
      {items.map((a) => {
        if (a.kind === Kind.Flagged)
          return (
            <li key={a.index} className="stack" style={{ gap: 8 }}>
              <AgentLabel agent="bekci" meta={dateTime(a.time)} />
              <p className="bub">{a.text || `${member.nickname}, bu turun taksidi son ödeme gününde gelmedi.`}</p>
            </li>
          );
        if (a.kind === Kind.Excuse)
          return (
            <li key={a.index} className="stack" style={{ gap: 8, alignItems: "flex-end" }}>
              <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{member.nickname} · {dateTime(a.time)}</span>
              <p className="bub bub-me">{a.text}</p>
            </li>
          );
        if (a.kind === Kind.AutoSlashed)
          return (
            <li key={a.index} className="sys">Süre doldu; taksit kural gereği teminattan karşılandı ({mon(a.amount)}).</li>
          );
        return (
          <li key={a.index} className="stack" style={{ gap: 8 }}>
            <AgentLabel agent="muhtar" meta={`hakem · ${dateTime(a.time)}`} />
            <p className="bub">{member.nickname}, yazdıklarını okudum. Kararımı ve nedenlerini yanına yazdım.</p>
          </li>
        );
      })}
      {member.excuse && !member.decided && !member.paid && (
        <li className="stack" style={{ gap: 8 }}>
          <AgentLabel agent="muhtar" />
          <p className="bub typing" aria-label="Muhtar mazereti okuyor"><span /><span /><span /></p>
        </li>
      )}
      {items.length === 0 && <li className="muted">Bu tur için henüz mesaj yok.</li>}
      <li className="sr-only">{d.group.name}</li>
    </ol>
  );
}

function Body({ d, refresh }: { d: GroupData; refresh: () => void }) {
  const { account, send } = useWallet();
  const now = useNow();
  const g = d.group;
  const lateMembers = d.members.filter((m) => m.flagged || m.excuse || m.decided || m.covered);
  const meMember = d.members.find((m) => sameAddr(m.account, account));
  const [selected, setSelected] = useState<string | null>(null);
  const member =
    d.members.find((m) => sameAddr(m.account, selected ?? undefined)) ??
    (meMember && (lateMembers.includes(meMember) || (!meMember.paid && now > g.deadline)) ? meMember : lateMembers[0] ?? meMember);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okHash, setOkHash] = useState<string | null>(null);

  if (g.status !== Status.Active) {
    return (
      <>
        <PageHeader title="Mazeret ve kararlar" />
        <p className="alert alert-info">{g.status === Status.Forming ? "Grup henüz başlamadı; mazeret ve kararlar turlar başlayınca burada görünür." : "Grup tamamlandı; açık bir gecikme yok."}</p>
      </>
    );
  }
  if (!member) {
    return (
      <>
        <PageHeader title="Mazeret ve kararlar" />
        <p className="alert alert-info">Bu tur geciken taksit yok. Son ödeme günü {dateTime(g.deadline)}.</p>
      </>
    );
  }

  const isMe = sameAddr(member.account, account);
  const items = d.activities
    .filter((a) => a.time >= g.roundStart && THREAD_KINDS.includes(a.kind) && (sameAddr(a.subject, member.account) || sameAddr(a.actor, member.account)))
    .sort((x, y) => x.index - y.index);
  const decision = [...items].reverse().find((a) => a.kind === Kind.Extension || a.kind === Kind.Slashed || a.kind === Kind.AutoSlashed);
  const parsed = decision ? parseReason(decision.text) : null;
  const late = !member.paid && now > g.deadline;
  const canExcuse = isMe && late && !member.excuse;
  const missingCollateral = g.collateral - member.collateralLeft;

  const askMuhtar = async () => {
    setBusy("muhtar");
    try {
      const r = await fetch("/api/muhtar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ groupId: g.id.toString(), member: member.account }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Muhtar şu an karar veremedi.");
      refresh();
    } catch (e) {
      setErr(`${(e as Error).message} Bekçi birazdan mazereti yeniden iletecek.`);
    } finally {
      setBusy(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setErr(null);
    setBusy("excuse");
    try {
      await send({ functionName: "submitExcuse", args: [g.id, text.trim()] });
      setText("");
      refresh();
      await askMuhtar();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const act = async (kind: "pay" | "topup") => {
    setErr(null);
    setBusy(kind);
    try {
      const { hash } =
        kind === "pay"
          ? await send({ functionName: "payInstallment", args: [g.id], value: g.installment })
          : await send({ functionName: "topUpCollateral", args: [g.id], value: missingCollateral });
      setOkHash(hash);
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const isExtension = decision?.kind === Kind.Extension;

  return (
    <>
      <PageHeader
        title={isMe ? "Geciken taksit" : "Mazeret ve kararlar"}
        sub={`${g.round}. tur · son ödeme ${dateTime(g.deadline)} · ${isMe ? "kendi durumunu görüyorsun" : `${member.nickname} için`}`}
      />

      {lateMembers.length > 1 && (
        <div className="wraprow" role="group" aria-label="Üye seç" style={{ gap: 8 }}>
          {lateMembers.map((m) => (
            <button key={m.account} type="button" className="btn btn-g" aria-pressed={sameAddr(m.account, member.account)} onClick={() => setSelected(m.account)} style={{ minHeight: 44, borderColor: sameAddr(m.account, member.account) ? "var(--purple)" : undefined }}>
              {m.nickname}
            </button>
          ))}
        </div>
      )}

      <div className="cols">
        <section className="card card-pad stack" aria-label="Mazeret görüşmesi" style={{ flex: "3 1 480px", minWidth: 0, gap: 20 }}>
          <Thread items={items} d={d} member={member} />

          {canExcuse && (
            <form onSubmit={submit} className="stack" style={{ gap: 8, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
              <label htmlFor="mazeret" style={{ fontSize: 15, fontWeight: 600 }}>Mazeretini yaz</label>
              <textarea id="mazeret" className="input" rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Örn. bursum perşembe yatıyor, o gün öderim" />
              <div className="wraprow" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, flex: "1 1 260px" }}>
                  Mazeretin kayda geçer ve Muhtar okur. Muhtar paraya dokunamaz; yalnızca süre verebilir ya da teminattan bir taksit kesebilir.
                </p>
                <button className="btn btn-p" type="submit" disabled={!!busy || !text.trim()}>
                  {busy === "excuse" ? "Gönderiliyor…" : "Muhtar'a gönder"}
                </button>
              </div>
            </form>
          )}
          {isMe && !late && !member.paid && (
            <p className="alert alert-info">Son ödeme günü henüz geçmedi. Mazeret, gecikme olduktan sonra yazılabilir.</p>
          )}
          {member.excuse && !member.decided && !member.paid && (
            <div className="wraprow" style={{ gap: 10, alignItems: "center" }}>
              <p className="muted" style={{ fontSize: 14, flex: "1 1 240px" }}>Muhtar mazereti okuyor. Karar birkaç saniye içinde burada görünür.</p>
              <button className="btn btn-g" type="button" disabled={!!busy} onClick={askMuhtar}>{busy === "muhtar" ? "Muhtar okuyor…" : "Muhtar'a tekrar ilet"}</button>
            </div>
          )}
        </section>

        <aside className="stack" style={{ flex: "2 1 380px", minWidth: 0, gap: 16 }}>
          {decision ? (
            <section
              aria-labelledby="karar"
              className="card card-pad stack glow"
              style={{ gap: 16, border: `2px solid ${isExtension ? "var(--ok)" : "var(--late)"}` }}
            >
              <span className={`pill ${isExtension ? "pill-ok" : "pill-late"}`} style={{ alignSelf: "flex-start" }}>
                {decision.kind === Kind.AutoSlashed ? "Kural · süre doldu" : `Muhtar'ın kararı · ${isExtension ? "Süre ver" : "Teminatı kes"}`}
              </span>
              <h2 id="karar" style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 800 }}>
                {isExtension ? `${dateTime(decision.amount)} tarihine kadar süre verildi` : `Teminattan ${mon(decision.amount)} kesildi ve havuza eklendi`}
              </h2>
              {parsed && parsed.reasons.length > 0 && (
                <div className="stack" style={{ gap: 8 }}>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Gerekçe</h3>
                    {parsed.source && (
                      <span className="pill" title={parsed.source === "kural" ? "Model yanıt vermedi ya da karar sabit kuraldan çıktı" : "Karar yapay zekâ modelinden geldi"} style={{ fontSize: 12 }}>
                        {parsed.source}
                      </span>
                    )}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 15, lineHeight: 1.5 }}>
                    {parsed.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {parsed?.next && (
                <div className="stack" style={{ gap: 6, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>Bundan sonra</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.55 }}>{parsed.next}</p>
                </div>
              )}
              <p className="muted wraprow" style={{ alignItems: "center", gap: 6, fontSize: 13, padding: "10px 12px", borderRadius: 12, background: "var(--bg)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                Karar kayda geçti, değiştirilemez · {dateTime(decision.time)} · <TxLink hash={decision.txHash} label="Karar" />
              </p>
            </section>
          ) : (
            <section className="card card-pad stack" style={{ gap: 8 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700 }}>Karar</h2>
              <p className="muted" style={{ fontSize: 15 }}>{member.excuse ? "Muhtar mazereti değerlendiriyor." : "Henüz karar yok. Mazeret yazılınca Muhtar okuyup kararını gerekçesiyle burada paylaşır."}</p>
            </section>
          )}

          {isMe && !member.paid && (
            <button className="btn btn-p btn-lg" type="button" disabled={!!busy} onClick={() => act("pay")}>
              {busy === "pay" ? "Ödeniyor…" : `Taksidi öde · ${mon(g.installment)}`}
            </button>
          )}
          {isMe && missingCollateral > 0n && (
            <button className="btn btn-g btn-lg" type="button" disabled={!!busy} onClick={() => act("topup")}>
              {busy === "topup" ? "Gönderiliyor…" : `Teminatı tamamla · ${mon(missingCollateral)}`}
            </button>
          )}
          {okHash && <p className="alert alert-ok">İşlem tamamlandı. Kayıt: <TxLink hash={okHash} /></p>}
          {err && <p role="alert" className="alert alert-err">{err}</p>}
        </aside>
      </div>
    </>
  );
}

export default function MazeretPage() {
  const page = useGroupPage();
  return <GroupFrame active="mazeret" page={page}>{(d) => <Body d={d} refresh={page.refresh} />}</GroupFrame>;
}
