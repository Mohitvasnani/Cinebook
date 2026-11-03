"use client";

import Link from "next/link";

import styles from "@/css/SiteHeader.module.css";
import { API_BASE_URL, IS_MOCK } from "@/services/apiConfig";

/* Wordmark, mode badge, and the banner saying where the data comes from.
   The banner is not dismissible on purpose: a demo that hides the fact it is
   a demo is exactly what this project should not be. */
export function SiteHeader() {
  return (
    <header>
      <div className={styles.bar}>
        <Link href="/" className={styles.wordmark}>
          Screen<em>book</em>
        </Link>

        <div className={styles.right}>
          <span className={IS_MOCK ? styles.badgeDemo : styles.badgeLive}>
            <span aria-hidden>{IS_MOCK ? "○" : "●"}</span>
            {IS_MOCK ? "DEMO" : "LIVE"}
          </span>
          <Link href="/race" className={styles.raceLink}>
            Race demo
          </Link>
        </div>
      </div>

      <p className={IS_MOCK ? styles.bannerDemo : styles.bannerLive}>
        <span className={styles.bannerInner}>
          {IS_MOCK
            ? "Demo mode: showtimes, seats and bookings are mock data kept in this browser."
            : `Live mode: connected to ${API_BASE_URL || "the API"}. Holds and bookings are real.`}
        </span>
      </p>
    </header>
  );
}