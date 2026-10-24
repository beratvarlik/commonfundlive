import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { AgentPaused, agentReady, runMuhtar } from "@/lib/server/agents";
import { checkLimit } from "@/lib/server/guard";
import { friendlyError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Mazeret zincire yazıldıktan sonra çağrılır; Muhtar okur, karar verir ve kararı zincire yazar.
 * Üye ödemişse, mazeret yoksa ya da karar verilmişse zincire işlem atılmaz (409). Cüzdan bakiyesi
 * 3 MON'un altındaysa işlem gönderilmez (503, paused).
 */
export async function POST(req: Request) {
  const limited = checkLimit(req, "muhtar");
  if (limited) return limited;
  const notReady = agentReady("muhtar");
  if (notReady) return NextResponse.json({ error: `Muhtar çalışmıyor: ${notReady}` }, { status: 503 });
  let groupId: bigint;
  let member: Address;
  try {
    const body = (await req.json()) as { groupId?: string | number; member?: string };
    groupId = BigInt(String(body.groupId));
    const m = String(body.member);
    if (!isAddress(m)) throw new Error();
    member = m;
  } catch {
    return NextResponse.json({ error: "Grup numarası ya da üye adresi geçersiz." }, { status: 400 });
  }
  try {
    const r = await runMuhtar(groupId, member);
    return NextResponse.json({ decision: r.decision, reasons: r.reasons, next: r.next, hash: r.hash, source: r.source });
  } catch (e) {
    if (e instanceof AgentPaused) return NextResponse.json({ error: e.message, paused: true }, { status: 503 });
    return NextResponse.json({ error: friendlyError(e) }, { status: 409 });
  }
}
