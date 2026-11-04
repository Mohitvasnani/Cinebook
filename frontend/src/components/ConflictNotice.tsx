import styles from "@/css/ConflictNotice.module.css";
import type { UnavailableSeat } from "@/types/api";

import { StatusPill } from "./StatusPill";

/* Shown when a claim loses one or more seats. The 409 names each lost seat and
   the state it is in now, which is what lets this say "F1 was booked, F2 is
   held by someone else" rather than "something went wrong".
   
   Booked is critical, held is warning: a booked seat is gone for good, a held
   one may come back in five minutes. Different news, different weight. */
export function ConflictNotice({
  seats,
  keptCount,
}: {
  seats: UnavailableSeat[];
  /* How many of the chosen seats survived, so the hint can tell them whether
     there is anything left to retry with. */
  keptCount: number;
}) {
  const one = seats.length === 1;

  return (
    <div className={styles.notice} role="status">
      <span className={styles.heading}>
        {one
          ? `${seats[0].rowLabel}${seats[0].seatNumber} just went.`
          : `${seats.length} of your seats just went.`}
      </span>

      <ul className={styles.list}>
        {seats.map((seat) => (
          <li key={seat.seatId}>
            <StatusPill tone={seat.status === "BOOKED" ? "critical" : "warning"}>
              {seat.rowLabel}
              {seat.seatNumber} ·{" "}
              {seat.status === "BOOKED" ? "booked" : "held by someone else"}
            </StatusPill>
          </li>
        ))}
      </ul>

      <p className={styles.hint}>
        {keptCount > 0
          ? `Nothing was held, so your other ${keptCount === 1 ? "seat is" : `${keptCount} seats are`} still selected. Pick a replacement or hold what you have.`
          : "Nothing was held. Pick again."}
      </p>
    </div>
  );
}