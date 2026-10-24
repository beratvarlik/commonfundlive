"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader, Shell } from "@/components/Shell";
import { isDeployed } from "@/lib/chain";
import { duration, mon } from "@/lib/format";
import { fetchGroup, sameAddr, Status, type GroupData } from "@/lib/group";
import { useWallet } from "@/lib/wallet";

function JoinInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { send, account } = useWallet();
  const [code, setCode] = useState(sp.get("kod") || "");
  const [data, setData] = useState<GroupData | null>(null);
  const [lookErr, setLookErr] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [nickname, setNickname] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const look = async (c: string) => {
    setLookErr(null);
    setData(null);
    if (!/^\d+$/.test(c.trim())) {
      setLookErr("Davet kodu yalnızca rakamlardan oluşur. Grubu kuran kişiden kodu tekrar iste.");
      return;
    }
    if (!isDeployed) {
      setLookErr("Kasa sözleşmesi henüz kurulmadı. README'deki kurulum adımlarını izle.");
      return;
    }
    setLooking(true);
    try {
      const d = await fetchGroup(BigInt(c.trim()), 5);
      if (!d) setLookErr("Bu kodla bir grup bulunamadı. Kodu kontrol et.");
      else setData(d);
    } catch {
      setLookErr("Kasaya şu an ulaşılamıyor. Birkaç saniye sonra tekrar dene.");
    } finally {
      setLooking(false);
    }
  };

  useEffect(() => {
    const k = sp.get("kod");
    if (k) look(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const g = data?.group;
  const already = !!(data && account && data.members.some((m) => sameAddr(m.account, account)));
  const full = !!g && g.members.length >= g.size;
  const closed = !!g && g.status !== Status.Forming;

  const join = async () => {
    if (!g) return;
    setJoining(true);
    setError(null);
    try {
      await send({ functionName: "join", args: [g.id, nickname.trim()], value: g.collateral });
      router.push(`/grup/${g.id.toString()}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <PageHeader title="Davet koduyla katıl" sub="Grubu kuran arkadaşının gönderdiği kodu gir." />
      <div className="cols">
        <form
          className="card card-pad stack"
          style={{ flex: "1 1 360px", gap: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            look(code);
          }}
        >
          <label htmlFor="kod" className="label">Davet kodu</label>
          <input id="kod" className="input num" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Örn. 3" />
          <button className="btn btn-g" type="submit" disabled={looking || !code.trim()}>{looking ? "Aranıyor…" : "Grubu bul"}</button>
          {lookErr && <p role="alert" className="alert alert-err">{lookErr}</p>}
        </form>

        {g && (
          <section className="card card-pad stack glow" aria-labelledby="grup-adi" style={{ flex: "2 1 420px", gap: 8 }}>
            <h2 id="grup-adi" style={{ fontSize: 22, fontWeight: 800 }}>{g.name}</h2>
            <p className="muted" style={{ fontSize: 15 }}>{g.members.length} / {g.size} kişi katıldı</p>
            <dl className="dl" style={{ marginTop: 8 }}>
              <div><dt>Tur başı taksit</dt><dd>{mon(g.installment)}</dd></div>
              <div><dt>Teminat (şimdi yatırılır)</dt><dd>{mon(g.collateral)}</dd></div>
              <div><dt>Tur havuzu</dt><dd>{mon(g.installment * BigInt(g.size))}</dd></div>
              <div><dt>Son ödeme</dt><dd>Tur başından {duration(g.payWindow)} sonra</dd></div>
              <div><dt>Üyeler</dt><dd>{data!.members.map((m) => m.nickname).join(", ")}</dd></div>
            </dl>
            {already ? (
              <div className="alert alert-info" style={{ marginTop: 8 }}>
                Bu gruba zaten katıldın. <Link href={`/grup/${g.id}`}>Grup paneline git</Link>
              </div>
            ) : closed || full ? (
              <div className="alert alert-info" style={{ marginTop: 8 }}>Bu grup doldu ve başladı; yeni üye alınmıyor. Yeni bir grup kurabilirsin.</div>
            ) : (
              <div className="stack" style={{ gap: 10, paddingTop: 12 }}>
                <label htmlFor="nick" className="label">Gruptaki adın</label>
                <input id="nick" className="input" value={nickname} maxLength={24} onChange={(e) => setNickname(e.target.value)} placeholder="Örn. Elif" />
                <button className="btn btn-p" type="button" disabled={joining || !nickname.trim()} onClick={join}>
                  {joining ? "Katılınıyor…" : `Teminatı yatır ve katıl · ${mon(g.collateral)}`}
                </button>
                <p className="muted" style={{ fontSize: 13 }}>Teminat grup bitince sana geri döner. Gecikmelerde yalnızca Muhtar&apos;ın kararıyla ya da süre dolunca kesilebilir.</p>
              </div>
            )}
            {error && <p role="alert" className="alert alert-err">{error}</p>}
          </section>
        )}
      </div>
    </>
  );
}

export default function KatilPage() {
  return (
    <Shell active="katil">
      <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
        <JoinInner />
      </Suspense>
    </Shell>
  );
}
