import seatStyles from "@/css/Seat.module.css";
import styles from "@/css/SeatLegend.module.css";

/* Imports Seat.module.css on purpose: the swatches have to be the same states
   the map draws. Copying the rules here would let the legend and the map drift
   apart.

   Each swatch is a real .seat inside a 16px box rather than a square with the
   state class pasted on. A plain square would need its own border rules, and
   those would fight the state's border rules depending on which stylesheet the
   bundler happened to emit last.

   Drawn in the Normal tint, because the legend is about state, not tier. Tier
   is labelled in the cross-aisles instead. */
const ITEMS = [
  { label: "Free", state: seatStyles.available, mark: null },
  { label: "Yours", state: seatStyles.selected, mark: null },
  { label: "Held by someone", state: seatStyles.held, mark: "held" },
  { label: "Booked", state: seatStyles.booked, mark: null },
];

export function SeatLegend() {
  return (
    <ul className={styles.root}>
      {ITEMS.map((item) => (
        <li key={item.label} className={styles.item}>
          <span aria-hidden className={styles.swatchBox}>
            <span className={`${seatStyles.seat} ${seatStyles.normal} ${item.state}`}>
              {item.mark === "held" && <span className={seatStyles.heldMark} />}
            </span>
          </span>
          {item.label}
        </li>
      ))}
           <li className={styles.hint}>Arrow keys move · Enter selects</li>
    </ul>
  );
}