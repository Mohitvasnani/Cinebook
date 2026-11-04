/* One row, no gaps. The same rule the server enforces, written here so the UI
   can stop you making the mistake rather than letting the API refuse you.

   Aisles are ignored on purpose: seats 3 and 4 have a walking aisle between
   them and still count as neighbours. See HoldService.requireAdjacent. */

import type { Seat } from "@/types/api";

/** Can this seat join the current run without breaking it? */
export function extendsRun(selected: Seat[], seat: Seat): boolean {
  if (selected.length === 0) return true;

  const row = selected[0].rowLabel;
  if (seat.rowLabel !== row) return false;

  const numbers = selected.map((s) => s.seatNumber);
  const lowest = Math.min(...numbers);
  const highest = Math.max(...numbers);

  /* Only the two ends extend a run. Anything inside it is already selected,
     and anything further out would leave a gap. */
  return seat.seatNumber === lowest - 1 || seat.seatNumber === highest + 1;
}

/** Removing this seat has to leave what remains contiguous, so: the ends only. */
export function isRunEnd(selected: Seat[], seat: Seat): boolean {
  if (selected.length <= 1) return true;

  const numbers = selected.map((s) => s.seatNumber);
  return (
    seat.seatNumber === Math.min(...numbers) ||
    seat.seatNumber === Math.max(...numbers)
  );
}
