"use client";

import styles from "@/css/StateMessage.module.css";
import { ApiError } from "@/services/problemDetails";

import { StatusPill } from "./StatusPill";

/* Shown where content failed to load. Not for the conflict case: a seat going
   while you looked at it is a normal outcome, not an error, and gets a calm
   inline message on the seat map instead.

   The API's own detail is preferred over a generic line. Every failure arrives
   as RFC 9457 problem details, so there is almost always a server-written
   sentence that says more than "something went wrong". */
export function ErrorState({
  error,
  title = "Could not load this.",
  onRetry,
}: {
  error?: ApiError | Error | null;
  title?: string;
  onRetry?: () => void;
}) {
  const api = error instanceof ApiError ? error : null;

  return (
    <div className={styles.panel} role="alert">
      <span className={styles.title}>{title}</span>

      {api && (
        <StatusPill tone="critical" mono>
          {api.status} {api.slug}
        </StatusPill>
      )}

      {error?.message && <p className={styles.detail}>{error.message}</p>}

      {onRetry && (
        <button type="button" onClick={onRetry} className={styles.action}>
          Try again
        </button>
      )}
    </div>
  );
}