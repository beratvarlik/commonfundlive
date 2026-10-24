import { txUrl } from "@/lib/chain";
import { shortHash } from "@/lib/format";

export function TxLink({ hash, label }: { hash?: string; label?: string }) {
  if (!hash) return <span className="muted" style={{ fontSize: 14 }}>kayıt aranıyor…</span>;
  return (
    <a className="txa" href={txUrl(hash)} target="_blank" rel="noopener noreferrer" aria-label={label ? `${label}, kaydı gör` : "Kaydı gör"}>
      {shortHash(hash)}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17L17 7M9 7h8v8" />
      </svg>
    </a>
  );
}
