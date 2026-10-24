"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AgentKey } from "./Agent";
import type { RingMember } from "./Ring";
import { Shell, type NavKey } from "./Shell";
import { dateTime, initial, mon, nowSec } from "@/lib/format";
import { Kind, nameOf, sameAddr, Status, type ActivityInfo, type GroupData } from "@/lib/group";
import { useGroup } from "@/lib/useGroup";
import { useWallet } from "@/lib/wallet";

/** Grup sayfalarının ortak verisi: zincirden okuma + Bekçi'yi düzenli çalıştırma. */
export function useGroupPage() {
  const params = useParams<{ id: string }>();
  const raw = params?.id ?? "";
  const valid = /^\d+$/.test(raw);
  const id = valid ? BigInt(raw) : null;
  const g = useGroup(id);
  const [bekciNote, setBekciNote] = useState<string | null>(null);
  const last = useRef(0);

  useEffect(() => {
    const d = g.data;
    if (!d || d.group.status !== Status.Active) return;
    const now = nowSec();
    const needs = d.members.some((m) => !m.paid && now > d.group.deadline);
    if (!needs || now - last.current < 25) return;
    last.current = now;
    fetch("/api/bekci", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ groupId: raw }) })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok && j.error) setBekciNote(j.error);
        else if (j.paused && j.message) setBekciNote(j.message);
        else {
          setBekciNote(null);
          if (j.actions?.length) g.refresh();
        }
      })
      .catch(() => setBekciNote("Bekçi'ye ulaşılamadı; gecikmeler birazdan yeniden kontrol edilecek."));
  }, [g.data, g.refresh, raw]);

  return { ...g, idStr: raw, valid, bekciNote };
}

export function GroupFrame({ active, page, children }: { active: NavKey; page: ReturnType<typeof useGroupPage>; children: (d: GroupData) => ReactNode }) {
  const d = page.data;
  const meta = d ? (d.group.status === Status.Forming ? `Üyeler bekleniyor · ${d.group.members.length}/${d.group.size}` : d.group.status === Status.Active ? `${d.group.size} üye · ${d.group.round}. tur / ${d.group.size}` : "Tamamlandı") : undefined;
  return (
    <Shell active={active} groupId={page.valid ? page.idStr : undefined} groupName={d?.group.name} groupMeta={meta}>
      {!page.valid || page.notFound ? (
        <section className="card card-pad stack" style={{ gap: 12, padding: 40, alignItems: "center", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Grup bulunamadı</h1>
          <p className="muted">Bu bağlantıdaki davet kodu hiçbir grupla eşleşmiyor. Kodu kontrol et ya da gruplarına dön.</p>
          <Link className="btn btn-p" href="/gruplar">Gruplarım</Link>
        </section>
      ) : page.error && !d ? (
        <p role="alert" className="alert alert-err">{page.error}</p>
      ) : !d ? (
        <p className="muted" aria-live="polite">Grup yükleniyor…</p>
      ) : (
        <>
          {page.error && <p role="status" className="alert alert-info">{page.error}</p>}
          {page.bekciNote && <p role="status" className="alert alert-info">{page.bekciNote}</p>}
          {children(d)}
        </>
      )}
    </Shell>
  );
}

export function ringMembers(d: GroupData, me?: string): RingMember[] {
  const g = d.group;
  const list: RingMember[] = d.members.map((m) => {
    const late = g.status === Status.Active && !m.paid && nowSec() > g.deadline;
    let state: RingMember["state"] = "idle";
    if (m.received) state = "got";
    else if (m.paid) state = "paid";
    if (late) state = m.received ? "got" : "late";
    return {
      label: sameAddr(m.account, me) ? `${m.nickname} (sen)` : m.nickname,
      initial: initial(m.nickname),
      state,
      badge: late,
    };
  });
  for (let i = list.length; i < g.size; i++) list.push({ label: "Boş yer", initial: "?", state: "empty" });
  return list;
}

export type Line = { agent?: AgentKey; text: string; amount?: string };

export function describe(a: ActivityInfo, d: GroupData): Line {
  const who = nameOf(d.members, a.actor);
  const subj = nameOf(d.members, a.subject);
  switch (a.kind) {
    case Kind.Created:
      return { agent: "katip", text: `Grup kuruldu: ${a.text}` };
    case Kind.Joined:
      return { text: `${who} teminatını yatırıp katıldı`, amount: mon(a.amount) };
    case Kind.Started:
      return { agent: "katip", text: "Grup doldu, 1. tur başladı" };
    case Kind.Paid:
      return { text: `${who} taksidini yatırdı`, amount: mon(a.amount) };
    case Kind.Excuse:
      return { text: `${who} mazeret yazdı` };
    case Kind.Flagged:
      return { agent: "bekci", text: `Bekçi gecikmeyi işaretledi · ${subj}` };
    case Kind.Extension:
      return { agent: "muhtar", text: `Muhtar süre verdi · ${subj} · son gün ${dateTime(a.amount)}` };
    case Kind.Slashed:
      return { agent: "muhtar", text: `Muhtar teminattan kesti · ${subj}`, amount: mon(a.amount) };
    case Kind.AutoSlashed:
      return { agent: "bekci", text: `Süre doldu, taksit teminattan karşılandı · ${subj}`, amount: mon(a.amount) };
    case Kind.Draw:
      return { text: `Kura: ${subj} havuzu aldı`, amount: mon(a.amount) };
    case Kind.TopUp:
      return { text: `${who} teminatını tamamladı`, amount: mon(a.amount) };
    case Kind.Withdraw:
      return { text: `${who} teminatını geri aldı`, amount: mon(a.amount) };
    default:
      return { text: "İşlem" };
  }
}

/** Yardımcının "ne yaptım" kartı için son işleri */
export function agentLog(agent: AgentKey, d: GroupData): string[] {
  const out: string[] = [];
  for (const a of d.activities) {
    const subj = nameOf(d.members, a.subject);
    const who = nameOf(d.members, a.actor);
    const at = dateTime(a.time);
    if (agent === "katip") {
      if (a.kind === Kind.Created) out.push(`${at}: Grubu kurdum, kuralları kayda geçirdim.`);
      if (a.kind === Kind.Joined) out.push(`${at}: Katılımı kaydettim · ${who}`);
      if (a.kind === Kind.Paid) out.push(`${at}: Taksiti kaydettim · ${who}`);
      if (a.kind === Kind.Draw) out.push(`${at}: Kura sonucunu kaydettim · ${subj}`);
    } else if (agent === "bekci") {
      if (a.kind === Kind.Flagged) out.push(`${at}: Gecikmeyi işaretledim ve mesaj bıraktım · ${subj}`);
      if (a.kind === Kind.Excuse) out.push(`${at}: Mazereti Muhtar'a ilettim · ${who}`);
      if (a.kind === Kind.AutoSlashed) out.push(`${at}: Süre doldu, kural gereği teminattan karşılattım · ${subj}`);
    } else {
      if (a.kind === Kind.Extension) out.push(`${at}: Mazereti okudum, süre verdim · ${subj}`);
      if (a.kind === Kind.Slashed) out.push(`${at}: Mazereti okudum, teminattan kestim · ${subj}`);
    }
    if (out.length >= 4) break;
  }
  if (!out.length) {
    if (agent === "katip") out.push("Grup kayıtları burada görünecek.");
    if (agent === "bekci") out.push("Şu an geciken ödeme yok. Son ödeme günü geçince kontrol ediyorum.");
    if (agent === "muhtar") out.push("Henüz karar vermem gereken bir mazeret olmadı.");
  }
  return out;
}

export function useMe() {
  const { account } = useWallet();
  return account;
}
