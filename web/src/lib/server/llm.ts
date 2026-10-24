// Yalnızca sunucuda (API rotalarında) kullanılır; anahtar tarayıcıya gitmez.

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

const BASE = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.LLM_MODEL || "openai/gpt-oss-120b";
const KEY = process.env.LLM_API_KEY || "";
// Model bu süre içinde cevap vermezse kurallı yedeğe geçilir (tüm denemeler için toplam süre).
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 8000;

export const llmEnabled = () => KEY.length > 0;

// Model zaman aşımına uğrarsa bu zamana kadar doğrudan kurallı yedek kullanılır.
let downUntil = 0;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("JSON bulunamadı");
  return JSON.parse(text.slice(start, end + 1));
}

async function call(messages: ChatMsg[], jsonMode: boolean, timeoutMs: number, maxTokens: number): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.3,
        max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Model hatası ${res.status}`);
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(t);
  }
}

/**
 * Ücretsiz bir modelden JSON cevap ister. Anahtar yoksa ya da model cevap veremezse
 * `fallback` ile kurallı cevap döner; demo her durumda akar.
 */
export async function askJson<T>(system: string, messages: ChatMsg[], validate: (x: unknown) => T | null, fallback: () => T, maxTokens = 600): Promise<{ data: T; source: "model" | "yedek" }> {
  if (!llmEnabled() || Date.now() < downUntil) return { data: fallback(), source: "yedek" };
  const all: ChatMsg[] = [{ role: "system", content: system }, ...messages];
  const until = Date.now() + TIMEOUT_MS;
  for (const jsonMode of [true, false]) {
    const left = until - Date.now();
    if (left < 500) break;
    try {
      const text = await call(all, jsonMode, left, maxTokens);
      const parsed = validate(extractJson(text));
      if (parsed) return { data: parsed, source: "model" };
    } catch (e) {
      // Zaman aşımı ya da ağ hatasında kısa süre modeli hiç deneme; sıradaki istekler beklemesin.
      if (!(e instanceof Error) || !e.message.startsWith("Model hatası")) {
        if ((e as Error)?.name === "AbortError" || e instanceof TypeError) downUntil = Date.now() + 30000;
      }
      // bir sonraki denemeye ya da kurala geç
    }
  }
  return { data: fallback(), source: "yedek" };
}
