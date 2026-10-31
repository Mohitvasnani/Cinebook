import seatStyles from "@/css/Seat.module.css";
import styles from "@/css/SeatLegend.module.css";

/* Imports Seat.module.css on purpose: the swatches have to be the same four
   states the map draws. Copying the rules here would let the legend and the
   map drift apart. */
const ITEMS = [
  { label: "Free", state: seatStyles.available },
  { label: "Your seat", state: seatStyles.selected },
  { label: "Held by someone", state: seatStyles.held },
  { label: "Booked", state: seatStyles.booked },
];

export function SeatLegend() {
  return (
    <ul className={styles.root}>
      {ITEMS.map((item) => (
        <li key={item.label} className={styles.item}>
          <span aria-hidden className={`${styles.swatch} ${item.state}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}