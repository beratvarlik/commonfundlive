import Link from "next/link";
import { AGENTS, AgentAvatar, type AgentKey } from "@/components/Agent";
import { Logo } from "@/components/Brand";
import { Ring } from "@/components/Ring";
import { ThemeToggle } from "@/components/ThemeToggle";

const check = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L19 7" />
  </svg>
);

const agentText: Record<AgentKey, string> = {
  katip: "Grubu sohbetle kurar, kuralları özetler, her ödemeyi kayda geçirir.",
  bekci: "Son ödeme gününü takip eder, geciken taksiti fark eder, mazereti Muhtar'a iletir.",
  muhtar: "Mazereti okur; süre verir ya da teminattan keser. Her kararı gerekçesiyle yazar.",
};

export default function Home() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="wraprow" style={{ maxWidth: 1200, margin: "0 auto", padding: "14px clamp(16px,4vw,40px)", alignItems: "center", justifyContent: "space-between", gap: "12px 24px" }}>
          <Logo size={42} />
          <nav aria-label="Üst menü" className="wraprow" style={{ alignItems: "center", gap: "4px 18px" }}>
            <a className="topnav-a" href="#nasil">Nasıl çalışır</a>
            <a className="topnav-a" href="#yardimcilar">Yardımcılar</a>
            <Link className="topnav-a" href="/gruplar">Gruplarım</Link>
          </nav>
          <div className="row" style={{ gap: 10 }}>
            <ThemeToggle />
            <Link className="btn btn-g" href="/katil">Davet koduyla katıl</Link>
            <Link className="btn btn-p" href="/kur">Grup kur</Link>
          </div>
        </div>
      </header>

      <main>
        <section style={{ position: "relative", overflow: "hidden" }}>
          <div aria-hidden="true" style={{ position: "absolute", right: -220, top: -260, width: 720, height: 720, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(99,102,241,.22), transparent)" }} />
          <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto", padding: "clamp(40px,7vw,96px) clamp(16px,4vw,40px)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(460px,100%),1fr))", gap: 56, alignItems: "center" }}>
            <div className="stack" style={{ gap: 22 }}>
              <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase" }} className="muted">Together we build more</p>
              <h1 style={{ fontSize: "clamp(38px,5vw,60px)", lineHeight: 1.05, fontWeight: 800, textWrap: "balance" }}>Arkadaşlarınla birikim yap, havuzu sırayla al.</h1>
              <p className="muted" style={{ fontSize: 19, lineHeight: 1.55, maxWidth: 540 }}>
                Her ay herkes eşit taksit yatırır, kurayla biri havuzu alır. Herkes bir kez alana kadar sürer. Kurayı da kasayı da şirket değil, kod yönetsin.
              </p>
              <div className="wraprow" style={{ gap: 12, paddingTop: 6 }}>
                <Link className="btn btn-p btn-lg" href="/kur">Grup kur</Link>
                <a className="btn btn-g btn-lg" href="#nasil">Nasıl çalıştığını gör</a>
              </div>
              <ul className="wraprow muted" style={{ listStyle: "none", margin: 0, padding: "18px 0 0", gap: "10px 22px", fontSize: 14 }}>
                <li className="row" style={{ gap: 8 }}>{check}Para kimsenin elinde durmaz</li>
                <li className="row" style={{ gap: 8 }}>{check}Her işlem herkese açık kayıtta</li>
                <li className="row" style={{ gap: 8 }}>{check}Kurallar onaylanınca değişmez</li>
              </ul>
            </div>

            <div className="card glow stack" style={{ padding: "clamp(20px,3vw,36px)", gap: 22 }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                <div className="stack" style={{ gap: 2 }}>
                  <span className="muted" style={{ fontSize: 13 }}>Örnek grup</span>
                  <span className="disp" style={{ fontSize: 18, fontWeight: 700 }}>Yurt 4. kat · 3. tur / 5</span>
                </div>
                <span className="pill pill-got">Havuz 0,5 MON</span>
              </div>
              <Ring
                orbit="live"
                ariaLabel="Beş üyeli örnek halka. Ayşe ve Mert havuzu aldı, diğerleri bu tur ödedi."
                members={[
                  { label: "Ayşe", initial: "A", state: "got" },
                  { label: "Berat", initial: "B", state: "paid" },
                  { label: "Elif", initial: "E", state: "paid" },
                  { label: "Mert", initial: "M", state: "got" },
                  { label: "Zeynep", initial: "Z", state: "paid" },
                ]}
                center={
                  <>
                    <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Bu turun havuzu</span>
                    <span className="disp num" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>0,5</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--got)" }}>MON</span>
                  </>
                }
              />
            </div>
          </div>
        </section>

        <section id="nasil" aria-labelledby="nasil-b" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="stack" style={{ maxWidth: 1200, margin: "0 auto", padding: "72px clamp(16px,4vw,40px)", gap: 32 }}>
            <h2 id="nasil-b" style={{ fontSize: "clamp(28px,3vw,36px)", fontWeight: 800 }}>Nasıl çalışır</h2>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px,100%),1fr))", gap: 20 }}>
              {[
                ["Grubu kur", "Kâtip'e kaç kişi olduğunuzu ve aylık taksidi yaz. Kuralları çıkarır; herkes teminatını yatırınca kasa açılır."],
                ["Her tur taksidini yatır", "Taksitler doğrudan kasaya gider. Geciken olursa Bekçi hatırlatır, Muhtar mazereti dinler."],
                ["Kurayla havuzu al", "Herkesin taksiti gelince kura çekilir, havuz kazananın cüzdanına geçer. Herkes bir kez alınca teminatlar geri döner."],
              ].map(([t, d], i) => (
                <li key={t} className="card stack" style={{ padding: 26, gap: 12 }}>
                  <span className="disp" style={{ fontSize: 15, fontWeight: 700, color: "var(--got)" }}>{i + 1}</span>
                  <h3 style={{ fontSize: 20, fontWeight: 700 }}>{t}</h3>
                  <p className="muted" style={{ fontSize: 15, lineHeight: 1.55 }}>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="yardimcilar" aria-labelledby="yard-b" style={{ borderTop: "1px solid var(--line)", background: "var(--bg2)" }}>
          <div className="stack" style={{ maxWidth: 1200, margin: "0 auto", padding: "72px clamp(16px,4vw,40px)", gap: 32 }}>
            <div className="stack" style={{ gap: 10, maxWidth: 640 }}>
              <h2 id="yard-b" style={{ fontSize: "clamp(28px,3vw,36px)", fontWeight: 800 }}>Grubunda üç yardımcı çalışır</h2>
              <p className="muted" style={{ fontSize: 16, lineHeight: 1.55 }}>Her biri tek bir işi yapar ve yaptığı her şeyi kayda yazar. Hiçbiri havuzdaki paraya dokunamaz.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px,100%),1fr))", gap: 20 }}>
              {(["katip", "bekci", "muhtar"] as AgentKey[]).map((k) => (
                <article key={k} className="card stack" style={{ padding: 26, gap: 14 }}>
                  <AgentAvatar agent={k} size={64} />
                  <h3 className={AGENTS[k].cls} style={{ fontSize: 20, fontWeight: 700 }}>{AGENTS[k].name}</h3>
                  <p className="muted" style={{ fontSize: 15, lineHeight: 1.55 }}>{agentText[k]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--line)" }}>
        <div className="wraprow muted" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px clamp(16px,4vw,40px)", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 14 }}>
          <span className="wm" style={{ fontSize: 18 }}>Common<b>Fund</b></span>
          <span>Monad deneme ağında çalışır</span>
        </div>
      </footer>
    </div>
  );
}
