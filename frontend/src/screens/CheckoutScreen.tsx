"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { HoldCountdown } from "@/components/HoldCountdown";
import styles from "@/css/CheckoutScreen.module.css";
import { useApi } from "@/hooks/useApi";
import { api } from "@/services/apiClient";
import { ApiError } from "@/services/problemDetails";
import { dayAndTime, money, seatNames } from "@/utils/format";

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

  /* Names and plurals come from the hold, not the showtime, because a hold can
     cover one seat or six and the copy has to read correctly either way. */
  const seatList = hold ? seatNames(hold.seats) : "";
  const count = hold?.seats.length ?? 0;
  const noun = count === 1 ? "seat" : "seats";
  const verb = count === 1 ? "is" : "are";

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
        seatName={seatList}
        onExpire={() => setExpired(true)}
      />

      <h1 className={styles.title}>
        {isOver ? `Your hold on ${seatList} ran out` : `Confirm your ${noun}`}
      </h1>

      {isOver ? (
        <div className={styles.panel}>
          <p className={styles.explain}>
            Holds last five minutes so nobody is kept waiting on a seat that never
            gets booked. {seatList} {verb} back on sale and {verb} still free a
            moment ago, so it is worth another try.
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

            {/* A line per seat with its own price. Three seats across three
                tiers have three different prices, so one combined line would
                leave the total unexplained. */}
            {hold.seats.map((seat) => (
              <Row
                key={seat.seatId}
                label={count === 1 ? "Seat" : ""}
                value={`${seat.rowLabel}${seat.seatNumber} · ${seat.tier.toLowerCase()} · ${money(seat.priceMinor, hold.currency)}`}
              />
            ))}

            {/* The hold's own total, not the showtime's price. The showtime
                carries the cheapest tier's price, so using it here undercharged
                every Premium and Executive seat. */}
            <div className={styles.total}>
              <dt>Total</dt>
              <dd className={`${styles.totalValue} tnum`}>
                {money(hold.totalMinor, hold.currency)}
              </dd>
            </div>
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
              : `Confirm booking · ${money(hold.totalMinor, hold.currency)}`}
          </button>

          <button
            type="button"
            className={styles.release}
            onClick={release}
            disabled={busy}
          >
            Release {seatList} and go back
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