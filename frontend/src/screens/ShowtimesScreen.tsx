"use client";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import Link from "next/link";

import styles from "@/css/ShowtimesScreen.module.css";
import { useApi } from "@/hooks/useApi";
import { api } from "@/services/apiClient";
import type { Showtime } from "@/types/api";
import { clockTime, money, runtime } from "@/utils/format";

export function ShowtimesScreen() {
  const { data, error, loading, reload } = useApi(() => api.listShowtimes(), "showtimes");

  /* The API returns a flat list; the screen shows them grouped under each film. */
  const byFilm = new Map<string, Showtime[]>();
  for (const showtime of data ?? []) {
    byFilm.set(showtime.filmTitle, [...(byFilm.get(showtime.filmTitle) ?? []), showtime]);
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>What&apos;s on</h1>
      <p className={styles.subtitle}>Riverside · {today}</p>

            {loading && (
        <div className={styles.skeletons} aria-busy aria-label="Loading showtimes">
          <Skeleton height="112px" />
          <Skeleton height="112px" />
        </div>
      )}

      {error && (
        <ErrorState
          error={error}
          title="Could not load showtimes."
          onRetry={reload}
        />
      )}

      {data?.length === 0 && (
        <EmptyState
          title="Nothing on today."
          detail="Check back tomorrow, or try another day."
        />
      )}

      {[...byFilm.entries()].map(([film, showtimes]) => (
        <section key={film} className={styles.film}>
          <h2 className={styles.filmTitle}>{film}</h2>
          <p className={styles.filmMeta}>{runtime(showtimes[0].runtimeMinutes)}</p>

          <ul className={styles.times}>
            {showtimes.map((showtime) => (
              <li key={showtime.id}>
                <ShowtimeCard showtime={showtime} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* Lives here rather than in components/ because nothing else renders one.
   Move it if that changes. */
function ShowtimeCard({ showtime }: { showtime: Showtime }) {
  const soldOut = showtime.seatsAvailable === 0;
  const nearlyFull = !soldOut && showtime.seatsAvailable <= 12;
  const filled = 1 - showtime.seatsAvailable / showtime.seatsTotal;

  const body = (
    <>
      <span className={soldOut ? styles.timeGone : styles.time}>
        {clockTime(showtime.startsAt)}
      </span>

      <span className={styles.meta}>
        <span>{showtime.screenName}</span>
        <span className="tnum">{money(showtime.priceMinor, showtime.currency)}</span>
      </span>

      <span className={styles.gauge} aria-hidden>
        <span className={styles.gaugeFill} style={{ width: `${filled * 100}%` }} />
      </span>

      <span className={nearlyFull ? styles.seatsLow : styles.seats}>
        {soldOut
          ? "Sold out"
          : nearlyFull
            ? `Nearly full · ${showtime.seatsAvailable} left`
            : `${showtime.seatsAvailable} of ${showtime.seatsTotal} left`}
      </span>
    </>
  );

  if (soldOut) {
    return <div className={styles.cardGone}>{body}</div>;
  }

  return (
    <Link
      href={`/showtimes/${showtime.id}`}
      className={nearlyFull ? styles.cardLow : styles.card}
    >
      {body}
    </Link>
  );
}