"use client";

import { useEffect, useRef, useState } from "react";

import styles from "@/css/HoldCountdown.module.css";
import { HOLD_TTL_SECONDS } from "@/services/apiConfig";
import { clockTime, mmss } from "@/utils/format";

/* Time left on a hold.

   The deadline is fixed on mount from ttlSeconds against the browser's own
   clock, not from expiresAt, so a machine whose clock is minutes out doesn't
   show a timer that starts at zero.

   Remaining time is derived from that deadline on every tick rather than
   decremented. A decrementing counter drifts, and browsers suspend timers in
   background tabs, so you'd return to a timer claiming three minutes left on a
   hold the server released long ago.

   The deadline is never recalculated, so give this a `key` tied to the hold id
   and React will remount it for a new hold. */
export function HoldCountdown({
  ttlSeconds,
  expiresAt,
  seatName,
  onExpire,
}: {
  ttlSeconds: number;
  expiresAt: string;
  seatName: string;
  onExpire?: () => void;
}) {
  /* Both read the clock once, inside a lazy initialiser. Reading it during
     render would make the component non-idempotent, which React 19 forbids. */
  const [deadline] = useState(() => Date.now() + ttlSeconds * 1000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const expired = left <= 0;
  const urgent = !expired && left < 60;

  const fired = useRef(false);
  useEffect(() => {
    if (expired && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [expired, onExpire]);

  const tone = expired ? styles.expired : urgent ? styles.urgent : styles.calm;

  return (
    <div className={`${styles.root} ${tone}`}>
      <div className={styles.head}>
        <p className={styles.label}>
          <span aria-hidden>{expired ? "⊗" : urgent ? "⧗" : "◷"}</span>
          {expired
            ? "Hold ended"
            : urgent
              ? "Under a minute left"
              : `${seatName} is held for you`}
        </p>

        <p
          className={`${styles.clock} tnum ${expired ? styles.clockDead : ""}`}
          role="timer"
          aria-live={urgent ? "assertive" : "off"}
        >
          {mmss(left)}
        </p>
      </div>

      {/* Urgency is carried by the icon, the bar becoming discrete ticks and
          the wording, so it still reads without colour. */}
      {urgent ? (
        <div aria-hidden className={styles.ticks}>
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className={i < Math.ceil(left / 5) ? styles.tickOn : styles.tickOff}
            />
          ))}
        </div>
      ) : (
        !expired && (
          <div aria-hidden className={styles.bar}>
            <div
              className={styles.barFill}
              style={{ width: `${(left / HOLD_TTL_SECONDS) * 100}%` }}
            />
          </div>
        )
      )}

      <p className={styles.note}>
        {expired
          ? `${seatName} has gone back on sale.`
          : urgent
            ? `Confirm now to keep ${seatName}. One tick is five seconds.`
            : `Released at ${clockTime(expiresAt)} if you don't confirm. Nothing is charged until then.`}
      </p>
    </div>
  );
}