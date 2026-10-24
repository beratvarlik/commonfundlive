"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Brand";
import { PageHeader, Shell } from "@/components/Shell";
import { isDeployed } from "@/lib/chain";
import { mon } from "@/lib/format";
import { fetchGroup, fetchUserGroups, Status, type GroupInfo } from "@/lib/group";
import { useWallet } from "@/lib/wallet";

const statusText = (g: GroupInfo) =>
  g.status === Status.Forming ? `Üyeler bekleniyor · ${g.members.length}/${g.size}` : g.status === Status.Active ? `${g.round}. tur / ${g.size}` : "Tamamlandı";

export default function GruplarPage() {
  const { account, connect } = useWallet();
  const [groups, setGroups] = useState<GroupInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) return;
    if (!isDeployed) {
      setError("Kasa sözleşmesi henüz kurulmadı. README'deki kurulum adımlarını izle.");
      return;
    }
    (async () => {
      try {
        const ids = await fetchUserGroups(account);
        const list = await Promise.all(ids.map((id) => fetchGroup(id, 1)));
        setGroups(list.filter(Boolean).map((d) => d!.group).reverse());
        setError(null);
      } catch {
        setError("Kasaya şu an ulaşılamıyor. Sayfayı birazdan yenile.");
      }
    })();
  }, [account]);

  return (
    <Shell active="gruplar">
      <PageHeader title="Gruplarım" />
      {error && <p role="alert" className="alert alert-err">{error}</p>}

      {!account ? (
        <section className="card card-pad stack" style={{ alignItems: "center", textAlign: "center", gap: 12, padding: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Gruplarını görmek için cüzdanını bağla</h2>
          <p className="muted" style={{ fontSize: 15 }}>Gruplar cüzdan adresine göre bulunur.</p>
          <button className="btn btn-p" type="button" onClick={() => connect().catch((e) => setError((e as Error).message))}>Cüzdanı bağla</button>
        </section>
      ) : groups && groups.length === 0 ? (
        <section className="card card-pad stack" style={{ alignItems: "center", textAlign: "center", gap: 12, padding: 40 }}>
          <LogoMark size={84} />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Henüz bir grubun yok</h2>
          <p className="muted" style={{ fontSize: 15 }}>Arkadaşlarınla yeni bir grup kur ya da sana gönderilen davet kodunu gir.</p>
          <div className="wraprow" style={{ gap: 10, justifyContent: "center" }}>
            <Link className="btn btn-p" href="/kur">Grup kur</Link>
            <Link className="btn btn-g" href="/katil">Davet koduyla katıl</Link>
          </div>
        </section>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px,100%),1fr))", gap: 20 }}>
          {(groups || []).map((g) => (
            <Link key={g.id.toString()} href={`/grup/${g.id}`} className="card card-pad stack" style={{ gap: 8, textDecoration: "none", color: "inherit" }}>
              <span className="muted" style={{ fontSize: 13 }}>Davet kodu {g.id.toString()}</span>
              <span className="disp" style={{ fontSize: 20, fontWeight: 700 }}>{g.name}</span>
              <span className="muted" style={{ fontSize: 14 }}>{statusText(g)}</span>
              <span style={{ fontSize: 14 }}>Tur başı {mon(g.installment)} · havuz {mon(g.installment * BigInt(g.size))}</span>
            </Link>
          ))}
          {!groups && <p className="muted">Gruplar yükleniyor…</p>}
        </div>
      )}
    </Shell>
  );
}
