import styles from "@/css/ModeBanner.module.css";
import { IS_MOCK } from "@/services/apiConfig";

/* One line saying where the data comes from. Not dismissible on purpose: a demo
   that hides the fact it is a demo is exactly what this project should not be.

   Lifted out of SiteHeader so the race page can state the same thing without
   repeating the copy. IS_MOCK is substituted at build time, so the branch not
   taken is removed from the bundle and this stays a server component. */
export function ModeBanner() {
  if (IS_MOCK) {
    return (
      <p className={styles.bannerDemo}>
        <span className={styles.bannerInner}>
          <svg
            aria-hidden
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
          </svg>
          <span>
            <strong className={styles.bannerLead}>Demo mode.</strong>{" "}
            <span className={styles.bannerRest}>
              Mock data in your browser. Nothing you book is real.
            </span>
          </span>
        </span>
      </p>
    );
  }

  return (
    <p className={styles.bannerLive}>
      <span className={styles.bannerInner}>
        <span aria-hidden className={styles.liveDot} />
        <span>
          <strong className={styles.bannerLead}>Live API.</strong>{" "}
          <span className={styles.bannerRest}>
            Seats are shared with everyone else using ScreenBook right now.
          </span>
        </span>
      </span>
    </p>
  );
}