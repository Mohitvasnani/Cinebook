"use client";

import { Fragment } from "react";

import styles from "@/css/SeatMap.module.css";
import type { Seat as SeatType } from "@/types/api";
import { TIERS, tierOf } from "@/utils/seatTiers";

import { Seat } from "./Seat";

/* Seats laid out 3 | 6 | 3 with two walking aisles, so the best seats sit in a
   six-wide centre block. The gaps are what make this read as a cinema rather
   than a spreadsheet, and they are the landmark people navigate by.

   Two cross-aisles separate the tiers, after row E and after row H. Each one
   carries the tier name, so the gap doubles as the section label and there is
   no separate legend row to keep in sync.

   One scaled view at every width. A zoom step would give bigger touch targets
   but adds a navigation mode to the one screen that matters. */
const BLOCKS = [
  [1, 2, 3],
  [4, 5, 6, 7, 8, 9],
  [10, 11, 12],
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

  /* Sorted here rather than trusting the order the API happened to return in.
     The cross-aisles depend on the rows being in sequence. */
  const rowLabels = [...rows.keys()].sort();

  return (
    <div className={styles.root}>
      <div className={styles.screenWrap} aria-hidden>
        <svg
          className={styles.curve}
          viewBox="0 0 560 50"
          preserveAspectRatio="none"
          fill="none"
        >
          <path d="M8 40 Q280 0 552 40 L552 50 L8 50 Z" fill="currentColor" fillOpacity="0.05" />
          <path d="M8 40 Q280 0 552 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className={styles.screen}>SCREEN</span>
      </div>

      <div className={styles.rows}>
        {rowLabels.map((rowLabel, i) => {
          const rowSeats = rows.get(rowLabel) ?? [];
          const tier = tierOf(rowLabel);
          /* A cross-aisle goes wherever the tier changes, the front row
             included: that one labels Normal. */
          const tierStarts = i === 0 || tierOf(rowLabels[i - 1]) !== tier;

          return (
            <Fragment key={rowLabel}>
              {tierStarts && (
                <div
                  className={styles.crossAisle}
                  style={{ ["--tier-color" as string]: TIERS[tier].cssVar }}
                >
                  <span className={styles.aisleRule} />
                  <span className={styles.aisleLabel}>{TIERS[tier].label.toUpperCase()}</span>
                  <span className={styles.aisleRule} />
                </div>
              )}

              <div className={styles.row}>
                <span className={`${styles.rowLabel} tnum`}>{rowLabel}</span>

                <div className={styles.blocks}>
                  {BLOCKS.map((block, blockIndex) => (
                    <div
                      key={blockIndex}
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
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}