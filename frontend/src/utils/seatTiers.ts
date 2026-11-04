/* Seat tiers.

   Derived from the row letter here on the client, because the API does not
   carry a tier yet: GET /api/showtimes/{id}/seats returns rowLabel,
   seatNumber and status and nothing else. That makes this the one place the
   mapping is written down, so when the backend grows a `tier` column and
   puts it on the seat payload, this file is what gets deleted.

   Until then the split matches the seeded layout in V3__seed_reference_data.sql:
   ten rows of twelve, A to J. */

export type Tier = "normal" | "premium" | "executive";

export const TIERS: Record<Tier, { label: string; cssVar: string }> = {
  normal: { label: "Normal", cssVar: "var(--tier-normal)" },
  premium: { label: "Premium", cssVar: "var(--tier-premium)" },
  executive: { label: "Executive", cssVar: "var(--tier-executive)" },
};

const NORMAL_ROWS = "ABCDE";
const PREMIUM_ROWS = "FGH";

export function tierOf(rowLabel: string): Tier {
  const row = rowLabel.toUpperCase();
  if (NORMAL_ROWS.includes(row)) return "normal";
  if (PREMIUM_ROWS.includes(row)) return "premium";
  return "executive";
}

export const tierLabel = (rowLabel: string): string => TIERS[tierOf(rowLabel)].label;