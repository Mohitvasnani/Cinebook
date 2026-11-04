import styles from "@/css/StatusPill.module.css";

export type Tone = "neutral" | "positive" | "warning" | "critical";

/* Each tone carries a mark as well as a colour, so the distinction survives
   greyscale, a colour-blind reader, and a screenshot in a README. The mark is
   aria-hidden because the pill's text already says the same thing in words. */
const GLYPH: Record<Tone, string> = {
  neutral: "·",
  positive: "✓",
  warning: "!",
  critical: "✕",
};

export function StatusPill({
  children,
  tone = "neutral",
  mono = false,
  glyph = true,
}: {
  children: React.ReactNode;
  tone?: Tone;
  /* For HTTP codes and booking references, which are read one character at a
     time rather than as a word. */
  mono?: boolean;
  glyph?: boolean;
}) {
  return (
    <span
      className={`${styles.pill} ${styles[tone]} ${mono ? styles.mono : ""}`}
    >
      {glyph && (
        <span aria-hidden className={styles.glyph}>
          {GLYPH[tone]}
        </span>
      )}
      {children}
    </span>
  );
}