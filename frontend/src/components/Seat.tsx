"use client";

import styles from "@/css/Seat.module.css";
import type { Seat as SeatType } from "@/types/api";
import { seatLabel } from "@/utils/format";

/* One seat.

   Every state is legible with colour removed:
     available  thin outline, empty
     selected   accent ring and a tick
     held       diagonal hatch
     booked     tinted fill and a cross

   Red/green is the obvious choice and the wrong one. Roughly one man in twelve
   can't separate them, and this is the screen where getting it wrong means
   booking a seat you didn't want. */
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

  const state = selected
    ? styles.selected
    : seat.status === "BOOKED"
      ? styles.booked
      : seat.status === "HELD"
        ? styles.held
        : styles.available;

  /* Screen readers get the state in words, since the visual cue carries it
     for everyone else. */
  const spoken = selected
    ? "your seat"
    : seat.status === "BOOKED"
      ? "booked"
      : seat.status === "HELD"
        ? "held by someone else"
        : "free";

  return (
    <button
      type="button"
      disabled={taken || pending}
      aria-label={`Seat ${seatLabel(seat.rowLabel, seat.seatNumber)}, ${spoken}`}
      aria-pressed={selected}
      onClick={() => onSelect(seat)}
      className={`${styles.seat} ${state}`}
    >
      <span aria-hidden>
        {selected ? "✓" : seat.status === "BOOKED" ? "✕" : ""}
      </span>
    </button>
  );
}