"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "@/css/SiteHeader.module.css";
import { IS_MOCK } from "@/services/apiConfig";

/* Wordmark, mode badge and nav. Sticky, so the mode badge stays visible: on the
   seat map you are making a decision about money, and whether this is a demo or
   the real API should never be something you have to scroll up to recheck.

   ModeBanner is rendered above this in app/layout.tsx rather than inside it,
   so the banner scrolls away and only the bar stays. */
export function SiteHeader() {
  const pathname = usePathname();
  const onRace = pathname.startsWith("/race");

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    /* passive: true tells the browser this listener will not call
       preventDefault, so scrolling is never blocked waiting on it. The read is
       window.scrollY only, which costs nothing. */
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.bar}>
        <Link href="/" className={styles.wordmark}>
          Screen<span className={styles.wordmarkAccent}>Book</span>
        </Link>

        <span className={IS_MOCK ? styles.badgeDemo : styles.badgeLive}>
          <span aria-hidden className={styles.badgeDot} />
          {IS_MOCK ? "DEMO" : "LIVE"}
        </span>

        <nav aria-label="Main" className={styles.nav}>
          <Link href="/" className={onRace ? styles.navLink : styles.navLinkActive}>
            Showtimes
          </Link>
          <Link href="/race" className={onRace ? styles.navLinkActive : styles.navLink}>
            <svg
              aria-hidden
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" />
            </svg>
            Race demo
          </Link>
        </nav>
      </div>
    </header>
  );
}