"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { parseEventLogs, type Address } from "viem";
import { GroupFrame, useGroupPage } from "@/components/GroupKit";
import { Ring, type RingMember } from "@/components/Ring";
import { PageHeader } from "@/components/Shell";
import { TxLink } from "@/components/TxLink";
import { commonFundAbi } from "@/lib/abi";
import { initial, mon } from "@/lib/format";
import { Kind, sameAddr, Status, type GroupData, type MemberInfo } from "@/lib/group";
import { useWallet } from "@/lib/wallet";

type Phase = "idle" | "sending" | "land" | "done";
type Result = { winner: Address; amount: bigint; hash: string; index: number; round: number };

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function KuraBody({ d, refresh }: { d: GroupData; refresh: () => void }) {
  const { send } = useWallet();
  const [phase, setPhase] = useState<Phase>("idle");
  const [snap, setSnap] = useState<{ members: MemberInfo[]; size: number; round: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const g = d.group;
  const view = snap ?? { members: d.members, size: g.size, round: g.round };
  const eligible = view.members.filter((m) => !m.received);
  const allPaid = g.paidCount === g.size;
  const winnerName = result ? view.members[result.index]?.nickname ?? "" : "";

  const draw = async () => {
    setErr(null);
    setResult(null);
    setSnap({ members: d.members, size: g.size, round: g.round });
    setPhase("sending");
    try {
      const { hash, receipt } = await send({ functionName: "draw", args: [g.id] });
      const logs = parseEventLogs({ abi: commonFundAbi, logs: receipt.logs, eventName: "ActivityLogged" });
      const ev = logs.find((l) => Number(l.args.kind) === Kind.Draw);
      if (!ev || !ev.args.subject) throw new Error("Kura sonucu okunamadı. Sayfayı yenile.");
      const index = d.members.findIndex((m) => sameAddr(m.account, ev.args.subject));
      setResult({ winner: ev.args.subject, amount: ev.args.amount ?? 0n, hash, index, round: g.round });
      if (reducedMotion()) {
        setPhase("done");
      } else {
        setPhase("land");
        timer.current = setTimeout(() => setPhase("done"), 2700);
      }
      refresh();
    } catch (e) {
      setErr((e as Error).message);
      setPhase("idle");
      setSnap(null);
    }
  };

  const members: RingMember[] = view.members.map((m, i) => ({
    label: phase === "done" && result?.index === i ? `${m.nickname} · +${mon(result.amount)}` : m.received ? `${m.nickname} · aldı` : m.nickname,
    initial: initial(m.nickname),
    state: phase === "done" && result?.index === i ? "win" : m.received ? "out" : allPaid || snap ? "paid" : m.paid ? "paid" : "idle",
  }));

  const orbit = phase === "sending" ? "spin" : phase === "land" || phase === "done" ? "land" : "live";

  return (
    <>
      <PageHeader title={`Kura · ${view.round}. tur`} sub={`${g.name} · havuz ${mon(g.installment * BigInt(g.size))}`} />
      <div className="cols" style={{ alignItems: "stretch" }}>
        <section className="card stack" aria-label="Kura halkası" style={{ flex: "3 1 520px", minWidth: 0, padding: "clamp(20px,3vw,40px)", justifyContent: "center", gap: 20, position: "relative", overflow: "hidden" }}>
          <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: 640, height: 640, margin: "-320px 0 0 -320px", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(99,102,241,.16), transparent)" }} />
          <Ring
            size={460}
            members={members}
            orbit={phase === "done" ? "land" : orbit}
            landIndex={result?.index ?? 0}
            coinTo={phase === "done" && result ? result.index : null}
            ariaLabel={phase === "done" && result ? `Kura sonucu: ${winnerName} kazandı, ${mon(result.amount)} gönderildi.` : `Kurada ${eligible.map((m) => m.nickname).join(", ")} var.`}
            center={
              phase === "done" && result ? (
                <>
                  <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Kazanan</span>
                  <span className="disp" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>{winnerName}</span>
                </>
              ) : (
                <>
                  <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Havuz</span>
                  <span className="disp num" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>{mon(snap ? g.installment * BigInt(g.size) : g.pot, false)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--got)" }}>MON</span>
                </>
              )
            }
          />
          <p aria-live="polite" style={{ position: "relative", fontSize: 16, textAlign: "center", minHeight: 24, fontWeight: 600 }}>
            {phase === "sending" ? "Kura çekiliyor… cüzdanında işlemi onayla." : phase === "land" ? "Sonuç geliyor…" : phase === "done" ? `Kazanan: ${winnerName}` : allPaid ? "Kura çekmeye hazır" : `Kura için ${g.size - g.paidCount} taksit daha bekleniyor`}
          </p>
        </section>

        <aside className="stack" aria-label="Kura bilgisi" style={{ flex: "2 1 340px", minWidth: 0, gap: 24 }}>
          <section className="card card-pad stack" aria-labelledby="kurada" style={{ gap: 12 }}>
            <h2 id="kurada" style={{ fontSize: 19, fontWeight: 700 }}>Bu tur kurada</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {eligible.map((m) => (
                <li key={m.account} className="row" style={{ gap: 10, minHeight: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--line)", fontSize: 15 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.paid || snap ? "var(--ok)" : "var(--muted)" }} />
                  {m.nickname}
                </li>
              ))}
            </ul>
            {view.members.some((m) => m.received) && (
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                Havuzu daha önce alanlar bu tur kurada değil: {view.members.filter((m) => m.received).map((m) => `${m.nickname} (${m.receivedRound}. tur)`).join(", ")}.
              </p>
            )}
          </section>

          {phase === "done" && result && (
            <section className="card card-pad stack glow" aria-labelledby="sonuc" style={{ gap: 10, borderColor: "var(--purple)" }}>
              <h2 id="sonuc" style={{ fontSize: 24, fontWeight: 800 }}>{winnerName} havuzu aldı</h2>
              <p style={{ fontSize: 15, lineHeight: 1.55 }}>
                {mon(result.amount)} {winnerName} adlı üyenin cüzdanına gönderildi.
                {g.status === Status.Completed ? " Bu son turdu; herkes havuzu bir kez aldı." : " Sıradaki tur başladı."}
              </p>
              <p className="muted wraprow" style={{ fontSize: 13, alignItems: "center", gap: 6 }}>Kayda geçti · <TxLink hash={result.hash} label="Kura sonucu" /></p>
            </section>
          )}

          <div className="stack" style={{ gap: 10 }}>
            {g.status !== Status.Active && !result ? (
              <p className="alert alert-info">{g.status === Status.Forming ? "Grup henüz başlamadı; herkes katılınca ilk tur açılır." : "Grup tamamlandı; çekilecek kura kalmadı."}</p>
            ) : phase === "done" ? (
              <>
                <Link className="btn btn-p" href={`/grup/${g.id}`}>Panele dön</Link>
                <button className="btn btn-g" type="button" onClick={() => { setPhase("idle"); setSnap(null); setResult(null); }}>Kapat</button>
              </>
            ) : (
              <button className="btn btn-p btn-lg" type="button" onClick={draw} disabled={!allPaid || phase !== "idle"} aria-disabled={!allPaid}>
                {phase === "idle" ? "Kura çek" : "Kura çekiliyor…"}
              </button>
            )}
            {!allPaid && g.status === Status.Active && phase === "idle" && (
              <p className="muted" style={{ fontSize: 14 }}>Herkesin taksiti gelince kura çekilebilir. Geciken olursa Bekçi ve Muhtar devreye girer.</p>
            )}
            {err && <p role="alert" className="alert alert-err">{err}</p>}
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>Kurayı kasa sözleşmesi çeker. Sonucu kimse önceden seçemez, sonradan değiştiremez.</p>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function KuraPage() {
  const page = useGroupPage();
  return <GroupFrame active="kura" page={page}>{(d) => <KuraBody d={d} refresh={page.refresh} />}</GroupFrame>;
}
