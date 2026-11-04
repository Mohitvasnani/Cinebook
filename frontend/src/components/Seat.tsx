"use client";

import styles from "@/css/Seat.module.css";
import type { Seat as SeatType } from "@/types/api";
import { money, seatLabel } from "@/utils/format";
import { tierClass } from "@/utils/seatTiers";

/* One seat.

   Two independent axes:

     tier   outline tint and silhouette (headrest, armrests)
     state  fill, border style, opacity and mark

   Keeping them separate means a tier can be added without touching any state
   rule, and the reverse. */
export function Seat({
  seat,
  selected,
  pending,
  onSelect,
  tabIndex,
}: {
  seat: SeatType;
  selected: boolean;
  pending: boolean;
  onSelect: (seat: SeatType) => void;
  /* Roving tabindex: exactly one seat in the map is 0, the rest are -1, so the
     grid is a single tab stop and arrow keys move within it. */
  tabIndex: number;
}) {
  const taken = seat.status === "BOOKED" || seat.status === "HELD";
  const tier = seat.tier;

  /* pending is the in-flight hold. It only means anything on seats the request
     is for, which is why it is read together with selected. */
  const claiming = selected && pending;

  const state = claiming
    ? styles.pending
    : selected
      ? styles.selected
      : seat.status === "BOOKED"
        ? styles.booked
        : seat.status === "HELD"
          ? styles.held
          : styles.available;

  /* Screen readers get tier, price and state in words, since the silhouette
     and the fill carry them for everyone else. */
  const spoken = claiming
    ? "selecting"
    : selected
      ? "selected"
      : seat.status === "BOOKED"
        ? "booked"
        : seat.status === "HELD"
          ? "held by another customer"
          : "available";

  const label = seatLabel(seat.rowLabel, seat.seatNumber);
  const price = money(seat.priceMinor, seat.currency);

  return (
    <button
      type="button"
      /* aria-disabled, not disabled. A disabled button cannot be focused, so
         arrow navigation would skip every taken seat and a screen reader user
         would never hear that D5 is booked. It stays reachable and announced;
         the click is guarded below instead. */
      aria-disabled={taken || pending}
      data-seat-id={seat.id}
      tabIndex={tabIndex}
      /* Pointer-only affordance. Touch users get the same facts in the summary
         panel once they tap. */
      title={`${label} · ${seat.tierName} · ${price}`}
      aria-label={`Seat ${label}, ${seat.tierName}, ${price}, ${spoken}`}
      aria-pressed={selected}
      onClick={() => {
        if (taken || pending) return;
        onSelect(seat);
      }}
      className={`${styles.seat} ${styles[tierClass(tier)]} ${state}`}
    >
      {claiming && <span aria-hidden className={styles.ring} />}

      {tier === "PREMIUM" && <span aria-hidden className={styles.headrest} />}

      {tier === "EXECUTIVE" && (
        <>
          <span aria-hidden className={`${styles.arm} ${styles.armLeft}`} />
          <span aria-hidden className={`${styles.arm} ${styles.armRight}`} />
        </>
      )}

      {seat.status === "HELD" && !selected && (
        /* A bar, not a cross. Held is temporary and booked is permanent, so
           they should not share a mark. */
        <span aria-hidden className={styles.heldMark} />
      )}

      {selected && !claiming && (
        <svg
          aria-hidden
          className={styles.check}
          width="60%"
          height="60%"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}

      {seat.status === "BOOKED" && !selected && (
        <svg
          aria-hidden
          width="50%"
          height="50%"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )}
    </button>
  );
}