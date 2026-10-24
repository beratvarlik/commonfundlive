import { NextResponse } from "next/server";
import { agentReady, runBekci } from "@/lib/server/agents";
import { checkLimit } from "@/lib/server/guard";
import { friendlyError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Model en çok 8 sn bekletilir (llm.ts); Bekçi'nin tur bütçesi 22 sn. İşlev süresi bunların üstünde kalır.
export const maxDuration = 30;

/**
 * Grup panelleri açıkken düzenli çağrılır: geciken üyeleri işaretler, mazeretleri Muhtar'a iletir.
 * Zincirde işlenecek gerçek bir durum yoksa hiçbir işlem atmaz. Cüzdan bakiyesi 3 MON'un altındaysa
 * işlem göndermez ve `paused: true` ile açıklayıcı bir mesaj döner.
 */
export async function POST(req: Request) {
  const limited = checkLimit(req, "bekci");
  if (limited) return limited;
  const notReady = agentReady("bekci");
  if (notReady) return NextResponse.json({ error: `Bekçi çalışmıyor: ${notReady}` }, { status: 503 });
  let groupId: bigint;
  try {
    const body = (await req.json()) as { groupId?: string | number };
    groupId = BigInt(String(body.groupId));
  } catch {
    return NextResponse.json({ error: "Grup numarası geçersiz." }, { status: 400 });
  }
  try {
    const r = await runBekci(groupId);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 500 });
  }
}
