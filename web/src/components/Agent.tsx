export type AgentKey = "katip" | "bekci" | "muhtar";

export const AGENTS: Record<AgentKey, { name: string; role: string; img: string; cls: string; color: string }> = {
  katip: { name: "Kâtip", role: "kayıt asistanı", img: "/avatars/katip.jpg", cls: "c-katip", color: "var(--katip)" },
  bekci: { name: "Bekçi", role: "ödeme takipçisi", img: "/avatars/bekci.jpg", cls: "c-bekci", color: "var(--bekci)" },
  muhtar: { name: "Muhtar", role: "hakem", img: "/avatars/muhtar.jpg", cls: "c-muhtar", color: "var(--muhtar)" },
};

export function AgentAvatar({ agent, size = 30 }: { agent: AgentKey; size?: number }) {
  const a = AGENTS[agent];
  return (
    <span className={`av ${a.cls}`} style={{ width: size, height: size }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.img} alt="" />
    </span>
  );
}

export function AgentLabel({ agent, meta }: { agent: AgentKey; meta?: string }) {
  const a = AGENTS[agent];
  return (
    <div className={`who ${a.cls}`}>
      <AgentAvatar agent={agent} />
      {a.name}
      {meta ? <small>{meta}</small> : null}
    </div>
  );
}
