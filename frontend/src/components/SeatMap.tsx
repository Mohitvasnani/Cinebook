"use client";

import { Fragment, useRef, useState } from "react";

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

   Two views. Fit scales 120 seats to the container, which at 375px leaves each
   one about 26px: fine for finding a seat, tight for tapping six of them.
   Zoom fixes the seat size and scrolls instead. Fit is the default because it
   answers "where is there space" and that is the first question. */
const BLOCKS = [
  [1, 2, 3],
  [4, 5, 6, 7, 8, 9],
  [10, 11, 12],
];

type View = "fit" | "zoom";

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
  /* Not persisted. A returning visitor gets fit again, which is the right
     starting point even if they zoomed last time. */
  const [view, setView] = useState<View>("fit");

  const rows = new Map<string, SeatType[]>();
  for (const seat of seats) {
    rows.set(seat.rowLabel, [...(rows.get(seat.rowLabel) ?? []), seat]);
  }

  /* Sorted here rather than trusting the order the API happened to return in.
     The cross-aisles depend on the rows being in sequence. */
  const rowLabels = [...rows.keys()].sort();

    const gridRef = useRef<HTMLDivElement>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  /* Lookup by position, for arrow navigation. Built once per render rather
     than scanning 120 seats on every key press. */
  const byPosition = new Map<string, SeatType>();
  for (const seat of seats) {
    byPosition.set(`${seat.rowLabel}:${seat.seatNumber}`, seat);
  }
  const at = (row: string | undefined, number: number) =>
    row ? byPosition.get(`${row}:${number}`) : undefined;

  /* The one seat in the tab order. Falls back to the first seat so the grid is
     always reachable, including before anything has been focused. */
  const tabStopId = focusedId ?? seats[0]?.id ?? null;

  function moveFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = seats.find((s) => s.id === tabStopId);
    if (!current) return;

    const rowIndex = rowLabels.indexOf(current.rowLabel);
    const inRow = (rows.get(current.rowLabel) ?? [])
      .slice()
      .sort((a, b) => a.seatNumber - b.seatNumber);

    let target: SeatType | undefined;
    switch (event.key) {
      case "ArrowRight":
        target = at(current.rowLabel, current.seatNumber + 1);
        break;
      case "ArrowLeft":
        target = at(current.rowLabel, current.seatNumber - 1);
        break;
      case "ArrowDown":
        target = at(rowLabels[rowIndex + 1], current.seatNumber);
        break;
      case "ArrowUp":
        target = at(rowLabels[rowIndex - 1], current.seatNumber);
        break;
      case "Home":
        target = inRow[0];
        break;
      case "End":
        target = inRow.at(-1);
        break;
      default:
        return;
    }
    if (!target) return;

    /* Only once a move is actually possible, so Arrow at the edge of the grid
       still scrolls the page rather than doing nothing. */
    event.preventDefault();
    setFocusedId(target.id);
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-seat-id="${target.id}"]`)
      ?.focus();
  }

  /* Keeps the tab stop wherever focus actually landed, including after a click
     or a Tab from outside, so arrow keys continue from the right place. */
  function trackFocus(event: React.FocusEvent<HTMLDivElement>) {
    const id = (event.target as HTMLElement).dataset?.seatId;
    if (id) setFocusedId(Number(id));
  }

  /* Every seat in a row shares its tier, so the first one speaks for the row. */
  const tierOfRow = (label: string): Tier | null =>
    rows.get(label)?.[0]?.tier ?? null;

  return (
    <div className={`${styles.root} ${view === "zoom" ? styles.zoom : ""}`}>
      <div className={styles.toolbar} role="group" aria-label="Seat map size">
        <ViewButton current={view} value="fit" onPick={setView}>
          Fit
        </ViewButton>
        <ViewButton current={view} value="zoom" onPick={setView}>
          Zoom
        </ViewButton>
      </div>

      {/* Only this scrolls. The toolbar stays put so the way back to Fit does
          not scroll off the side with the seats. */}
      <div className={styles.scroller}>
        <div className={styles.stage}>
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

          <div className={styles.rows}
           ref={gridRef}
            role="grid"
            aria-label="Seat map"
            onKeyDown={moveFocus}
            onFocusCapture={trackFocus}>
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
                          /* In fit, blocks grow in proportion to their seat
                             count so every seat ends up the same width. In
                             zoom the CSS overrides this with a fixed size. */
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
                                   tabIndex={seat.id === tabStopId ? 0 : -1}
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
      </div>
    </div>
  );
}

/* aria-pressed rather than a radio group: these are two buttons that change
   how the same thing is drawn, not a value being submitted. */
function ViewButton({
  current,
  value,
  onPick,
  children,
}: {
  current: View;
  value: View;
  onPick: (view: View) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      className={active ? styles.viewButtonActive : styles.viewButton}
      aria-pressed={active}
      onClick={() => onPick(value)}
    >
      {children}
    </button>
  );
}  