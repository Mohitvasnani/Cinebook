"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import styles from "@/css/ConfirmationScreen.module.css";
import { useApi } from "@/hooks/useApi";
import { api } from "@/services/apiClient";
import { dayAndTime, money, seatLabel } from "@/utils/format";

export function ConfirmationScreen() {
  const reference = String(useParams().reference);
  const { data, error, loading } = useApi(
    () => api.getBooking(reference),
    `booking:${reference}`,
  );

  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard?.writeText(data.bookingReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard access can be refused. The reference is on screen either
         way, so there is nothing to recover from. */
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <p>No booking found with reference {reference}.</p>
        </div>
        <Link href="/" className={styles.back}>
          Back to showtimes
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>CONFIRMED</p>
      <h1 className={styles.title}>You&apos;re booked</h1>

      <div className={styles.ticket}>
        <div className={styles.stub}>
          <p className={styles.stubLabel}>Booking reference</p>
          {/* The reference is the hero: it exists to be read out loud, so it
              gets the largest type on the screen. */}
          <p className={`${styles.reference} tnum`}>{data.bookingReference}</p>
          <button type="button" onClick={copy} className={styles.copy}>
            {copied ? "Copied" : "Copy reference"}
          </button>
        </div>

        {/* The perforation. It's a ticket, so it should look like it tears. */}
        <div aria-hidden className={styles.perforation} />

        <dl className={styles.details}>
          <Row label="Film" value={data.filmTitle} />
          <Row label="When" value={dayAndTime(data.startsAt)} />
          <Row label="Screen" value={data.screenName} />
          <Row label="Seat" value={seatLabel(data.seat.rowLabel, data.seat.seatNumber)} />

          <div className={styles.paid}>
            <dt className={styles.rowLabel}>Paid</dt>
            <dd className={`${styles.paidValue} tnum`}>
              {money(data.pricePaidMinor, data.currency)}
            </dd>
          </div>
        </dl>
      </div>

      <Link href="/" className={styles.back}>
        Back to showtimes
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <dt className={styles.rowLabel}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}