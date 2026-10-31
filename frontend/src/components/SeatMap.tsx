"use client";

import styles from "@/css/SeatMap.module.css";
import type { Seat as SeatType } from "@/types/api";

import { Seat } from "./Seat";

/* Seats laid out 2 | 8 | 2 with aisles between the blocks. The gaps are what
   make this read as a cinema rather than a spreadsheet, and they're the
   landmark people navigate by when choosing where to sit.

   One scaled view at every width. A zoom step would give bigger touch targets
   but adds a navigation mode to the one screen that matters. */
const BLOCKS = [
  [1, 2],
  [3, 4, 5, 6, 7, 8, 9, 10],
  [11, 12],
];

export function SeatMap({
  seats,
  selectedId,
  pending,
  onSelect,
}: {
  seats: SeatType[];
  selectedId: number | null;
  pending: boolean;
  onSelect: (seat: SeatType) => void;
}) {
  const rows = new Map<string, SeatType[]>();
  for (const seat of seats) {
    rows.set(seat.rowLabel, [...(rows.get(seat.rowLabel) ?? []), seat]);
  }

  return (
    <div className={styles.root}>
      <div className={styles.curve} aria-hidden />
      <p className={styles.screen} aria-hidden>
        SCREEN
      </p>

      <div className={styles.rows}>
        {[...rows.entries()].map(([rowLabel, rowSeats]) => (
          <div key={rowLabel} className={styles.row}>
            <span className={`${styles.rowLabel} tnum`}>{rowLabel}</span>

            <div className={styles.blocks}>
              {BLOCKS.map((block, i) => (
                <div
                  key={i}
                  className={styles.block}
                  /* Blocks grow in proportion to their seat count, so every
                     seat ends up the same width regardless of block. */
                  style={{ flexGrow: block.length }}
                >
                  {block.map((number) => {
                    const seat = rowSeats.find((s) => s.seatNumber === number);
                    if (!seat) return <div key={number} className={styles.gap} />;
                    return (
                      <div key={seat.id} className={styles.slot}>
                        <Seat
                          seat={seat}
                          selected={selectedId === seat.id}
                          pending={pending}
                          onSelect={onSelect}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <span className={`${styles.rowLabelEnd} tnum`}>{rowLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}