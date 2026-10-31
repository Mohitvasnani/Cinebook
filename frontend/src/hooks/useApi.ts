"use client";

import { useEffect, useState } from "react";

import type { ApiError } from "@/services/problemDetails";

type Loaded<T> = { key: string; data: T | null; error: ApiError | Error | null };

/* Fetch on mount, and again when `key` changes.

   The result is stored together with the key it belongs to, and "loading" means
   what's held doesn't match what's being asked for. That avoids resetting state
   inside the effect, which costs an extra render pass, and it means changing
   key never briefly shows the previous screen's data. */
export function useApi<T>(fn: () => Promise<T>, key: string) {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [nonce, setNonce] = useState(0);
  const cacheKey = `${key}#${nonce}`;

  useEffect(() => {
    let cancelled = false;

    fn()
      .then((data) => {
        if (!cancelled) setLoaded({ key: cacheKey, data, error: null });
      })
      .catch((error: Error) => {
        if (!cancelled) setLoaded({ key: cacheKey, data: null, error });
      });

    return () => {
      cancelled = true;
    };
    // fn is a new closure every render; cacheKey is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const fresh = loaded?.key === cacheKey ? loaded : null;

  return {
    data: fresh?.data ?? null,
    error: fresh?.error ?? null,
    loading: fresh === null,
    reload: () => setNonce((n) => n + 1),
  };
}