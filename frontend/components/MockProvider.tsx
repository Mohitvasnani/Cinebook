"use client";

import { useEffect, useState, type ReactNode } from "react";

import { isMockMode } from "@/lib/api/config";

/**
 * Starts the mock service worker before anything is allowed to fetch.
 *
 * Without this gate the first request can fire before the worker is listening,
 * which looks like an intermittent network failure. In live mode this renders
 * children immediately and the MSW chunk is never downloaded.
 */
export function MockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isMockMode);

  useEffect(() => {
    if (!isMockMode) return;

    let cancelled = false;

    void (async () => {
      const { worker } = await import("@/lib/mock/browser");
      await worker.start({ onUnhandledFrame: "bypass", quiet: true });
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">Starting demo mode...</p>
      </div>
    );
  }

  return <>{children}</>;
}
