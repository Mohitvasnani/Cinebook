import styles from "@/css/RequestLane.module.css";

export type LaneResult = {
  status: number;
  outcome: "won" | "lost" | "other";
  ms: number;
  body: string;
};

export function RequestLane({
  name,
  result,
  firing,
}: {
  name: string;
  result: LaneResult | null;
  firing: boolean;
}) {
  const badge = !result
    ? styles.badgeIdle
    : result.outcome === "won"
      ? styles.badgeWon
      : styles.badgeLost;

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span>[{name}] POST /api/holds</span>
        <span className={badge}>
          {!result
            ? firing
              ? "PENDING"
              : "IDLE"
            : `${result.status} ${result.outcome === "won" ? "WON" : result.outcome === "lost" ? "LOST" : ""}`}
        </span>
      </div>

      {result && (
        <p className={styles.body}>
          ← {result.ms.toFixed(1)}ms · {result.body}
        </p>
      )}
    </div>
  );
}