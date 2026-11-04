import styles from "@/css/Skeleton.module.css";

/* No "use client": this renders nothing interactive and holds no state, so it
   stays a server component and ships no JavaScript.

   aria-hidden with a live region elsewhere is deliberate. A screen reader
   should hear "loading showtimes" once, from the thing that knows what is
   loading, not a dozen announcements from individual grey rectangles. */
export function Skeleton({
  width,
  height,
  text = false,
  className,
}: {
  /* Any CSS length. A percentage is usually what you want, so the placeholder
     tracks the container the real content will fill. */
  width?: string;
  height?: string;
  /* Sizes to one line of body text, for placeholder copy rather than blocks. */
  text?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`${styles.skeleton} ${text ? styles.text : ""} ${className ?? ""}`}
      style={{ width, height }}
    />
  );
}