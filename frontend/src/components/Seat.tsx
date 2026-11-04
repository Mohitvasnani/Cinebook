"use client";

import styles from "@/css/Seat.module.css";
import type { Seat as SeatType } from "@/types/api";
import { seatLabel } from "@/utils/format";
import { TIERS, tierOf } from "@/utils/seatTiers";

/* One seat.

   Two independent axes, matching the "Seat: tiers x states" artboard:

     tier   outline tint and silhouette (headrest, armrests)
     state  fill, border style and glyph

   Keeping them separate means a tier can be added without touching any state
   rule, and the reverse. */
export function Seat({
  seat,
  selected,
  pending,
  onSelect,
}: {
  seat: SeatType;
  selected: boolean;
  pending: boolean;
  onSelect: (seat: SeatType) => void;
}) {
  const taken = seat.status === "BOOKED" || seat.status === "HELD";
  const tier = tierOf(seat.rowLabel);

  /* pending is the in-flight hold. It only means anything on the seat the
     request is for, which is why it is read together with selected. */
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

  /* Screen readers get tier and state in words, since the silhouette and the
     fill carry them for everyone else. */
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

  return (
    <button
      type="button"
      disabled={taken || pending}
      /* Pointer-only affordance. Touch users get the same facts in the
         summary panel once they tap. */
      title={`${label} · ${TIERS[tier].label}`}
      aria-label={`Seat ${label}, ${TIERS[tier].label}, ${spoken}`}
      aria-pressed={selected}
      onClick={() => onSelect(seat)}
      className={`${styles.seat} ${styles[tier]} ${state}`}
    >
      {claiming && <span aria-hidden className={styles.ring} />}

      {tier === "premium" && <span aria-hidden className={styles.headrest} />}

      {tier === "executive" && (
        <>
          <span aria-hidden className={`${styles.arm} ${styles.armLeft}`} />
          <span aria-hidden className={`${styles.arm} ${styles.armRight}`} />
        </>
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