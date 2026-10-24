// API rotaları için basit kötüye kullanım koruması: IP başına dakikalık sınır ve rota başına günlük genel tavan.
// Sayaçlar işlev örneğinin belleğinde tutulur (sunucusuz ortamda örnek başına çalışır); kesin bir tavan
// gerekiyorsa sayaçları Vercel KV / Upstash gibi paylaşılan bir depoya taşı.
import { NextResponse } from "next/server";

export type Route = "katip" | "muhtar" | "bekci";

const PER_MINUTE = Number(process.env.API_RATE_PER_MIN) || 10;
const DAILY_CAP: Record<Route, number> = {
  katip: Number(process.env.API_DAILY_KATIP) || 1000,
  muhtar: Number(process.env.API_DAILY_MUHTAR) || 300,
  bekci: Number(process.env.API_DAILY_BEKCI) || 3000,
};

const hits = new Map<string, number[]>();
const daily = new Map<string, { day: string; n: number }>();

function clientIp(req: Request): string {
  const h = req.headers;
  const fromProxy = h.get("x-vercel-forwarded-for") || h.get("x-real-ip") || h.get("x-forwarded-for");
  return (fromProxy?.split(",")[0] || "yerel").trim();
}

/** Sınır aşıldıysa 429 cevabı döner; aşılmadıysa null. */
export function checkLimit(req: Request, route: Route): NextResponse | null {
  const now = Date.now();

  const day = new Date(now).toISOString().slice(0, 10);
  const d = daily.get(route);
  if (!d || d.day !== day) daily.set(route, { day, n: 0 });
  const counter = daily.get(route)!;
  if (counter.n >= DAILY_CAP[route]) {
    return NextResponse.json(
      { error: "Bu hizmet için bugünkü genel kullanım sınırına ulaşıldı. Yarın yeniden dene." },
      { status: 429, headers: { "retry-after": "3600" } },
    );
  }

  const key = `${route}:${clientIp(req)}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= PER_MINUTE) {
    hits.set(key, recent);
    const wait = Math.max(1, Math.ceil((60_000 - (now - recent[0])) / 1000));
    return NextResponse.json(
      { error: `Çok sık istek gönderdin. ${wait} saniye sonra yeniden dene.` },
      { status: 429, headers: { "retry-after": String(wait) } },
    );
  }
  recent.push(now);
  hits.set(key, recent);
  counter.n += 1;

  // Bellek şişmesin: eski kayıtları ara sıra temizle.
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k);
  return null;
}
