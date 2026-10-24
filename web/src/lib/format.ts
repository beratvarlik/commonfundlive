import { formatEther, parseEther } from "viem";

/** 1.5 MON → "1,5 MON" */
export function mon(value: bigint, withUnit = true): string {
  const n = Number(formatEther(value));
  const s = n.toLocaleString("tr-TR", { maximumFractionDigits: 4 });
  return withUnit ? `${s} MON` : s;
}

/** "0,1" ya da "0.1" → wei */
export function parseMon(input: string): bigint {
  return parseEther(input.trim().replace(",", "."));
}

export function shortAddr(a?: string): string {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function shortHash(h?: string): string {
  if (!h) return "";
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

export function dateTime(sec: number | bigint): string {
  const d = new Date(Number(sec) * 1000);
  return d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function shortDate(sec: number | bigint): string {
  const d = new Date(Number(sec) * 1000);
  return d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Saniye cinsinden süreyi "2 gün 3 saat", "4 dk" gibi yazar */
export function duration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return h > 0 ? `${d} gün ${h} saat` : `${d} gün`;
  if (h > 0) return m > 0 ? `${h} saat ${m} dk` : `${h} saat`;
  if (m > 0) return s % 60 > 0 ? `${m} dk ${s % 60} sn` : `${m} dk`;
  return `${s} sn`;
}

export function initial(name: string): string {
  return (name.trim()[0] || "?").toLocaleUpperCase("tr-TR");
}

export const nowSec = () => Math.floor(Date.now() / 1000);
