"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { parseEventLogs } from "viem";
import { AgentLabel } from "@/components/Agent";
import { PageHeader, Shell } from "@/components/Shell";
import { TxLink } from "@/components/TxLink";
import { commonFundAbi } from "@/lib/abi";
import { duration, mon, parseMon } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

type Msg = { role: "user" | "assistant"; content: string };
type Params = { name: string; size: number; installment: string; collateral: string; speed?: "hizli" | "demo" | "gercek" | null };

const SPEEDS = {
  hizli: { label: "Hızlı demo: 1 tur = 90 saniye", period: 90, payWindow: 45, maxExtension: 30 },
  demo: { label: "Demo hızı: 1 tur = 10 dakika", period: 600, payWindow: 300, maxExtension: 180 },
  gercek: { label: "Gerçek takvim: 1 tur = 30 gün", period: 30 * 86400, payWindow: 20 * 86400, maxExtension: 7 * 86400 },
} as const;
type Speed = keyof typeof SPEEDS;

const FIRST: Msg = {
  role: "assistant",
  content: "Merhaba, ben Kâtip. Grubunuzu birlikte kuralım. Kaç kişisiniz ve her tur kişi başı kaç MON yatıracaksınız?",
};

function safeMon(s: string): bigint | null {
  try {
    return parseMon(s);
  } catch {
    return null;
  }
}

export default function KurPage() {
  const { send, account } = useWallet();
  const [messages, setMessages] = useState<Msg[]>([FIRST]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [params, setParams] = useState<Params | null>(null);
  const [speed, setSpeed] = useState<Speed>("demo");
  const [nickname, setNickname] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; hash: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setThinking(true);
    setError(null);
    try {
      const res = await fetch("/api/katip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Kâtip cevap veremedi.");
      setMessages([...next, { role: "assistant", content: j.reply }]);
      if (j.params) {
        setParams(j.params);
        if (j.params.speed) setSpeed(j.params.speed);
      }
    } catch (err) {
      setMessages([...next, { role: "assistant", content: "Şu an cevap veremedim. Mesajını tekrar gönderir misin?" }]);
      setError((err as Error).message);
    } finally {
      setThinking(false);
    }
  };

  const inst = params ? safeMon(params.installment) : null;
  const col = params ? safeMon(params.collateral) : null;
  const sp = SPEEDS[speed];
  const nickOk = nickname.trim().length > 0 && nickname.trim().length <= 24;
  const canCreate = !!params && inst !== null && inst > 0n && col !== null && nickOk && !creating;

  const create = async () => {
    if (!params || inst === null || col === null) return;
    setCreating(true);
    setError(null);
    try {
      const { hash, receipt } = await send({
        functionName: "createGroup",
        args: [params.name, params.size, inst, col, BigInt(sp.payWindow), BigInt(sp.period), BigInt(sp.maxExtension), nickname.trim()],
        value: col,
      });
      const logs = parseEventLogs({ abi: commonFundAbi, logs: receipt.logs, eventName: "ActivityLogged" });
      const id = logs[0]?.args.groupId?.toString() ?? "";
      setCreated({ id, hash });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const inviteUrl = created && typeof window !== "undefined" ? `${window.location.origin}/katil?kod=${created.id}` : "";

  return (
    <Shell active="kur">
      <PageHeader title="Yeni grup kur" sub="Kâtip birkaç mesajda kuralları çıkarır. Sen onaylayana kadar hiçbir şey kesinleşmez." />

      <div className="cols">
        <section aria-label="Kâtip ile sohbet" className="card card-pad stack" style={{ flex: "3 1 480px", minWidth: 0, gap: 20 }}>
          <ol aria-live="polite" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            {messages.map((m, i) =>
              m.role === "assistant" ? (
                <li key={i} className="stack" style={{ gap: 8 }}>
                  <AgentLabel agent="katip" />
                  <p className="bub">{m.content}</p>
                </li>
              ) : (
                <li key={i} className="stack" style={{ gap: 8, alignItems: "flex-end" }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Sen</span>
                  <p className="bub bub-me">{m.content}</p>
                </li>
              ),
            )}
            {thinking && (
              <li className="stack" style={{ gap: 8 }}>
                <AgentLabel agent="katip" />
                <p className="bub typing" aria-label="Kâtip yazıyor">
                  <span /><span /><span />
                </p>
              </li>
            )}
          </ol>
          <form onSubmit={ask} className="row" style={{ gap: 10, alignItems: "flex-end", paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="stack" style={{ flex: 1, gap: 6, minWidth: 0 }}>
              <label htmlFor="katip-mesaj" className="label">Kâtip&apos;e yaz</label>
              <input
                ref={inputRef}
                id="katip-mesaj"
                className="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Örn. 5 kişi, ayda 0,1 MON"
                autoComplete="off"
              />
            </div>
            <button className="btn btn-p" type="submit" disabled={thinking || !input.trim()}>Gönder</button>
          </form>
        </section>

        <section aria-labelledby="ozet" className="card card-pad stack glow" style={{ flex: "2 1 360px", minWidth: 0, gap: 6, borderColor: params ? "var(--katip)" : "var(--line)" }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 8, paddingBottom: 8 }}>
            <h2 id="ozet" style={{ fontSize: 20, fontWeight: 700 }}>Grup özeti</h2>
            {params && <span className="pill" style={{ color: "var(--katip)", background: "var(--katip-soft)" }}>Kâtip hazırladı</span>}
          </div>

          {!params ? (
            <p className="muted" style={{ fontSize: 15, lineHeight: 1.55, paddingTop: 8 }}>
              Kâtip&apos;e kaç kişi olduğunuzu ve her tur ne kadar yatıracağınızı yaz. Özet burada belirecek.
            </p>
          ) : created ? (
            <div className="stack" style={{ gap: 14, paddingTop: 8 }}>
              <div className="alert alert-ok">
                <strong>{params.name}</strong> kuruldu. Davet kodu: <strong className="num">{created.id}</strong>. Teminatını yatırdın; diğer {params.size - 1} kişi katılınca ilk tur başlar.
              </div>
              <p className="muted" style={{ fontSize: 13 }}>Kayıt: <TxLink hash={created.hash} label="Grup kuruldu" /></p>
              <div className="wraprow" style={{ gap: 10 }}>
                <button
                  className="btn btn-g"
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteUrl);
                      setCopied(true);
                    } catch {
                      setError(`Kopyalanamadı. Bağlantıyı elle paylaş: ${inviteUrl}`);
                    }
                  }}
                >
                  {copied ? "Bağlantı kopyalandı" : "Davet bağlantısını kopyala"}
                </button>
                <Link className="btn btn-p" href={`/grup/${created.id}`}>Grup paneline git</Link>
              </div>
            </div>
          ) : (
            <>
              <dl className="dl">
                <div><dt>Grup adı</dt><dd>{params.name}</dd></div>
                <div><dt>Üye sayısı</dt><dd>{params.size} kişi</dd></div>
                <div><dt>Tur başı taksit</dt><dd>{inst !== null ? `${mon(inst)}, kişi başı` : "Geçersiz tutar"}</dd></div>
                <div><dt>Tur havuzu</dt><dd>{inst !== null ? mon(inst * BigInt(params.size)) : "—"}</dd></div>
                <div><dt>Süre</dt><dd>{params.size} tur, herkes bir kez alır</dd></div>
                <div><dt>Teminat</dt><dd>{col !== null ? `${mon(col)}, sonunda geri döner` : "Geçersiz tutar"}</dd></div>
                <div><dt>Son ödeme</dt><dd>Tur başından {duration(sp.payWindow)} sonra</dd></div>
                <div><dt>Muhtar en fazla</dt><dd>{duration(sp.maxExtension)} süre verebilir</dd></div>
              </dl>

              <fieldset className="stack" style={{ border: 0, padding: "12px 0 0", margin: 0, gap: 8, borderTop: "1px solid var(--line)" }}>
                <legend className="label" style={{ padding: 0, marginBottom: 8 }}>Takvim</legend>
                {(Object.keys(SPEEDS) as Speed[]).map((k) => (
                  <label key={k} className="row" style={{ gap: 10, minHeight: 44, fontSize: 15, cursor: "pointer" }}>
                    <input type="radio" name="speed" value={k} checked={speed === k} onChange={() => setSpeed(k)} style={{ width: 18, height: 18 }} />
                    {SPEEDS[k].label}
                  </label>
                ))}
              </fieldset>

              <div className="stack" style={{ gap: 6, paddingTop: 8 }}>
                <label htmlFor="nick" className="label">Gruptaki adın</label>
                <input id="nick" className="input" value={nickname} maxLength={24} onChange={(e) => setNickname(e.target.value)} placeholder="Örn. Berat" />
              </div>

              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, padding: "12px 0 14px" }}>
                Onayladığında kasa açılır, {col !== null ? mon(col) : "teminat"} teminatın cüzdanından kasaya geçer ve kurallar sabitlenir. Sonradan kimse değiştiremez.
              </p>
              {!account && <p className="muted" style={{ fontSize: 13, paddingBottom: 8 }}>Onaylarken cüzdanını bağlaman istenecek.</p>}
              <div className="wraprow" style={{ gap: 10 }}>
                <button className="btn btn-p" type="button" style={{ flex: "1 1 200px" }} disabled={!canCreate} onClick={create}>
                  {creating ? "Kasa açılıyor…" : "Onayla ve grubu kur"}
                </button>
                <button
                  className="btn btn-g"
                  type="button"
                  style={{ flex: "1 1 140px" }}
                  onClick={() => {
                    setInput("Şunu değiştir: ");
                    inputRef.current?.focus();
                  }}
                >
                  Bir şeyi düzelt
                </button>
              </div>
              {!nickOk && <p className="muted" style={{ fontSize: 13, paddingTop: 8 }}>Kurmak için gruptaki adını yaz.</p>}
            </>
          )}
          {error && <p role="alert" className="alert alert-err" style={{ marginTop: 12 }}>{error}</p>}
        </section>
      </div>
    </Shell>
  );
}
