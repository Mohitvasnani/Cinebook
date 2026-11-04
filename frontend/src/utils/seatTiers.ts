/* Tier presentation. The tier itself now comes from the API, so this file no
   longer derives anything: it maps a tier code to the CSS variable that tints
   a seat. The old tierOf(rowLabel) guess is gone, along with the duplicated
   knowledge of which rows are which. */

import type { Tier } from "@/types/api";

export const TIERS: Record<Tier, { label: string; cssVar: string }> = {
  NORMAL: { label: "Normal", cssVar: "var(--tier-normal)" },
  PREMIUM: { label: "Premium", cssVar: "var(--tier-premium)" },
  EXECUTIVE: { label: "Executive", cssVar: "var(--tier-executive)" },
};

/* The CSS module class for a tier. Lowercase because Seat.module.css and
   SeatMap.module.css name their classes .normal, .premium, .executive. */
export const tierClass = (tier: Tier): string => tier.toLowerCase();