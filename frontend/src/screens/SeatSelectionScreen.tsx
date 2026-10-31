"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { SeatLegend } from "@/components/SeatLegend";
import { SeatMap } from "@/components/SeatMap";
import styles from "@/css/SeatSelectionScreen.module.css";
import { useApi } from "@/hooks/useApi";
import { api } from "@/services/apiClient";
import { ApiError } from "@/services/problemDetails";
import type { Seat } from "@/types/api";
import { dayAndTime, money, seatLabel } from "@/utils/format";

export function SeatSelectionScreen() {
  const router = useRouter();
  const showtimeId = Number(useParams().showtimeId);

  const [selected, setSelected] = useState<Seat | null>(null);
  const [holding, setHolding] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  const seats = useApi(() => api.getSeatMap(showtimeId), `seats:${showtimeId}`);
  const showtimes = useApi(() => api.listShowtimes(), "showtimes");
  const showtime = showtimes.data?.find((s) => s.id === showtimeId);

  async function hold() {
    if (!selected) return;

    setHolding(true);
    setConflict(null);

    try {
      const created = await api.createHold(showtimeId, selected.id);
      router.push(`/hold/${created.holdId}`);
    } catch (err) {
      /* Losing a seat between rendering the map and tapping it is ordinary,
         not an error page. Tell them plainly and refresh the map. */
      if (err instanceof ApiError && err.is("seat-unavailable")) {
        setConflict(
          `${seatLabel(selected.rowLabel, selected.seatNumber)} just went. Someone held it a moment before you.`,
        );
        setSelected(null);
        seats.reload();
      } else {
        setConflict("Could not hold that seat. Try again.");
      }
      setHolding(false);
    }
  }

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.back}>
        ← All showtimes
      </Link>

      <h1 className={styles.title}>{showtime?.filmTitle ?? "\u00a0"}</h1>
      {showtime && (
        <p className={styles.meta}>
          {dayAndTime(showtime.startsAt)} · {showtime.screenName} ·{" "}
          {money(showtime.priceMinor, showtime.currency)} a seat
        </p>
      )}

      <div className={styles.layout}>
        <div>
          {seats.loading && <div className={styles.skeleton} />}

          {seats.error && (
            <div className={styles.panel}>
              <p>Could not load the seat map.</p>
              <button type="button" onClick={seats.reload} className={styles.retry}>
                Try again
              </button>
            </div>
          )}

          {seats.data && (
            <>
              <SeatMap
                seats={seats.data.seats}
                selectedId={selected?.id ?? null}
                pending={holding}
                onSelect={(seat) => {
                  setConflict(null);
                  /* Tapping the chosen seat again clears it. */
                  setSelected((current) => (current?.id === seat.id ? null : seat));
                }}
              />
              <SeatLegend />
            </>
          )}
        </div>

        <aside className={styles.aside}>
          {conflict && (
            <div className={styles.conflict}>
              <p>{conflict}</p>
              <p className={styles.conflictHint}>Pick another seat.</p>
            </div>
          )}

          <div className={styles.summary}>
            <p className={styles.kicker}>YOUR SEAT</p>

            {selected && showtime ? (
              <>
                <div className={styles.chosen}>
                  <span className={styles.seatName}>
                    {seatLabel(selected.rowLabel, selected.seatNumber)}
                  </span>
                  <span className="tnum">
                    {money(showtime.priceMinor, showtime.currency)}
                  </span>
                </div>
                <p className={styles.row}>Row {selected.rowLabel}</p>
              </>
            ) : (
              <p className={styles.empty}>No seat chosen yet.</p>
            )}

            <button
              type="button"
              className={styles.hold}
              disabled={!selected || holding}
              onClick={hold}
            >
              {holding
                ? "Holding..."
                : selected
                  ? `Hold ${seatLabel(selected.rowLabel, selected.seatNumber)} for 5 minutes`
                  : "Hold seat"}
            </button>

            <p className={styles.note}>
              Holding keeps the seat for five minutes while you check out. Nothing is
              charged until you confirm.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}