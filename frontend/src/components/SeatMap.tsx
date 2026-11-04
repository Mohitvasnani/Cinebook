"use client";

import { Fragment } from "react";

import styles from "@/css/SeatMap.module.css";
import type { Seat as SeatType, Tier } from "@/types/api";
import { TIERS } from "@/utils/seatTiers";

import { Seat } from "./Seat";

/* Seats laid out 3 | 6 | 3 with two walking aisles, so the best seats sit in a
   six-wide centre block. The gaps are what make this read as a cinema rather
   than a spreadsheet, and they are the landmark people navigate by.

   Two cross-aisles separate the tiers. Where they fall is not decided here:
   the API gives every seat its tier, so an aisle appears wherever consecutive
   rows disagree. Reseating the house is a migration, not a frontend change.

   One scaled view at every width. A zoom step would give bigger touch targets
   but adds a navigation mode to the one screen that matters. */
const BLOCKS = [
  [1, 2, 3],
  [4, 5, 6, 7, 8, 9],
  [10, 11, 12],
];

export function SeatMap({
  seats,
  selectedIds,
  pending,
  onSelect,
}: {
  seats: SeatType[];
  /* A set, not an id: several seats can be selected at once, and a Set keeps
     the per-seat lookup O(1) across 120 seats. */
  selectedIds: ReadonlySet<number>;
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

  /* Every seat in a row shares its tier, so the first one speaks for the row. */
  const tierOfRow = (label: string): Tier | null =>
    rows.get(label)?.[0]?.tier ?? null;

  return (
    <div className={styles.root}>
      <div className={styles.screenWrap} aria-hidden>
        <svg
          className={styles.curve}
          viewBox="0 0 560 50"
          preserveAspectRatio="none"
          fill="none"
        >
          <path d="M8 40 Q280 0 552 40 L552 50 L8 50 Z" fill="currentColor" fillOpacity="0.08" />
          <path d="M8 40 Q280 0 552 40" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <span className={styles.screen}>SCREEN</span>
      </div>

      <div className={styles.rows}>
        {rowLabels.map((rowLabel, i) => {
          const rowSeats = rows.get(rowLabel) ?? [];
          const tier = tierOfRow(rowLabel);
          /* A cross-aisle goes wherever the tier changes, the front row
             included: that one labels the cheapest tier. */
          const tierStarts =
            tier !== null && (i === 0 || tierOfRow(rowLabels[i - 1]) !== tier);

          return (
            <Fragment key={rowLabel}>
              {tierStarts && tier && (
                <div
                  className={styles.crossAisle}
                  style={{ ["--tier-color" as string]: TIERS[tier].cssVar }}
                >
                  <span className={styles.aisleRule} />
                  <span className={styles.aisleLabel}>
                    {(rowSeats[0]?.tierName ?? TIERS[tier].label).toUpperCase()}
                  </span>
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
                              selected={selectedIds.has(seat.id)}
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