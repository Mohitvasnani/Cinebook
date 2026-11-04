import styles from "@/css/SiteFooter.module.css";

/* The footer is where this stops being a cinema site and says what it is: a
   backend exercise with its source and its API docs one click away. That is
   the point of the project, so it belongs on every page. */
const REPO_URL = "https://github.com/Mohitvasnani/ScreenBook";
const API_DOCS_URL = "https://cinebook-67pa.onrender.com/swagger-ui/index.html";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.wordmark}>ScreenBook</span>
        <span className={styles.strapline}>
          A seat booking system in Java 21 and Spring Boot 4
        </span>

        <nav aria-label="Footer" className={styles.nav}>
          <a href={REPO_URL} className={styles.link}>
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
            </svg>
            Repository
          </a>
          <a href={API_DOCS_URL} className={styles.link}>
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4h12l4 4v12H4z" />
              <path d="M8 12h8M8 16h5" />
            </svg>
            API docs (OpenAPI)
          </a>
        </nav>
      </div>
    </footer>
  );
}