"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { HoldCountdown } from "@/components/HoldCountdown";
import styles from "@/css/CheckoutScreen.module.css";
import { useApi } from "@/hooks/useApi";
import { api } from "@/services/apiClient";
import { ApiError } from "@/services/problemDetails";
import { dayAndTime, money, seatLabel } from "@/utils/format";

export function CheckoutScreen() {
  const router = useRouter();
  const holdId = String(useParams().holdId);

  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const holdQuery = useApi(() => api.getHold(holdId), `hold:${holdId}`);
  const showtimes = useApi(() => api.listShowtimes(), "showtimes");

  const hold = holdQuery.data;
  const showtime = showtimes.data?.find((s) => s.id === hold?.showtimeId);
  const seatName = hold ? seatLabel(hold.rowLabel, hold.seatNumber) : "";

  /* Expired either because the timer ran out in front of us, or because the
     hold was already past it when the page loaded. */
  const isOver = expired || hold?.status === "EXPIRED";

  async function confirm() {
    setBusy(true);
    setProblem(null);
    try {
      const booking = await api.createBooking(holdId);
      router.push(`/bookings/${booking.bookingReference}`);
    } catch (err) {
      if (err instanceof ApiError && err.is("hold-expired")) setExpired(true);
      else setProblem("Could not confirm. Try again.");
      setBusy(false);
    }
  }

  async function release() {
    setBusy(true);
    try {
      await api.releaseHold(holdId);
    } catch {
      /* Releasing is a courtesy. If it fails the hold lapses on its own, so
         there is nothing useful to tell the user. */
    }
    router.push(hold ? `/showtimes/${hold.showtimeId}` : "/");
  }

  if (holdQuery.loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (holdQuery.error || !hold) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <p>That hold could not be found.</p>
        </div>
        <Link href="/" className={styles.back}>
          Back to showtimes
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <HoldCountdown
        key={hold.holdId}
        ttlSeconds={hold.ttlSeconds}
        expiresAt={hold.expiresAt}
        seatName={seatName}
        onExpire={() => setExpired(true)}
      />

      <h1 className={styles.title}>
        {isOver ? `Your hold on ${seatName} ran out` : "Confirm your seat"}
      </h1>

      {isOver ? (
        <div className={styles.panel}>
          <p className={styles.explain}>
            Holds last five minutes so nobody is kept waiting on a seat that never
            gets booked. {seatName} is back on sale and was still free a moment ago,
            so it is worth another try.
          </p>
          <Link href={`/showtimes/${hold.showtimeId}`} className={styles.primary}>
            Back to seats
          </Link>
          <Link href="/" className={styles.secondary}>
            Choose a different showtime
          </Link>
        </div>
      ) : (
        <>
          <dl className={styles.summary}>
            {showtime && (
              <>
                <Row label="Film" value={showtime.filmTitle} />
                <Row label="When" value={dayAndTime(showtime.startsAt)} />
                <Row label="Screen" value={showtime.screenName} />
              </>
            )}
            <Row label="Seat" value={`${seatName} · row ${hold.rowLabel}`} />

            {showtime && (
              <div className={styles.total}>
                <dt>Total</dt>
                <dd className={`${styles.totalValue} tnum`}>
                  {money(showtime.priceMinor, showtime.currency)}
                </dd>
              </div>
            )}
          </dl>

          {problem && <p className={styles.problem}>{problem}</p>}

          <button
            type="button"
            className={styles.confirm}
            onClick={confirm}
            disabled={busy}
          >
            {busy
              ? "Confirming..."
              : `Confirm booking${showtime ? ` · ${money(showtime.priceMinor, showtime.currency)}` : ""}`}
          </button>

          <button
            type="button"
            className={styles.release}
            onClick={release}
            disabled={busy}
          >
            Release {seatName} and go back
          </button>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <dt className={styles.rowLabel}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}