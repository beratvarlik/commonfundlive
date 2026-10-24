"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Hash } from "viem";
import { isDeployed } from "./chain";
import { attachTxHashes, fetchGroup, type GroupData } from "./group";

/** Grubu zincirden okur ve birkaç saniyede bir tazeler. */
export function useGroup(id: bigint | null, intervalMs = 6000) {
  const [data, setData] = useState<GroupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const hashes = useRef(new Map<number, Hash>());

  const refresh = useCallback(async () => {
    if (id === null) return;
    if (!isDeployed) {
      setError("Kasa sözleşmesi henüz kurulmadı. README'deki kurulum adımlarını izle.");
      setLoading(false);
      return;
    }
    try {
      const d = await fetchGroup(id);
      if (!d) {
        setNotFound(true);
        setData(null);
      } else {
        hashes.current = await attachTxHashes(id, d.activities, hashes.current);
        d.activities = d.activities.map((a) => ({ ...a, txHash: hashes.current.get(a.index) }));
        setData(d);
        setNotFound(false);
      }
      setError(null);
    } catch {
      setError("Kasaya şu an ulaşılamıyor. Paran kasada, bu durumdan etkilenmez. Birkaç saniye içinde yeniden denenecek.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
  }, [refresh, intervalMs]);

  return { data, error, loading, notFound, refresh };
}

/** Saniyede bir güncellenen şimdiki zaman (geri sayımlar için). */
export function useNow(stepMs = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), stepMs);
    return () => clearInterval(t);
  }, [stepMs]);
  return now;
}
