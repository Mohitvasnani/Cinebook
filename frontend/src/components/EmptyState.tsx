import styles from "@/css/StateMessage.module.css";

/* Nothing to show, and that is the correct answer. Distinct from ErrorState
   because the two mean opposite things: empty means the request succeeded. */
export function EmptyState({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  /* An action, when there is somewhere useful to go. Often there is not, and
     an empty state that invents a button is worse than one that does not. */
  children?: React.ReactNode;
}) {
  return (
    <div className={`${styles.panel} ${styles.empty}`}>
      <span className={styles.title}>{title}</span>
      {detail && <p className={styles.detail}>{detail}</p>}
      {children}
    </div>
  );
}