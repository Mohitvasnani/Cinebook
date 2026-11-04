/* In-memory stand-in for the Postgres schema, used in demo mode.
   Mirrors docs/api-contract.md closely enough that swapping in the real API
   changes no component code.

   State lives in module scope: it survives client-side navigation and resets
   on a full page reload. */

   import { HOLD_TTL_SECONDS } from "@/services/apiConfig";
      import type { Booking, Seat, SeatStatus, Showtime, Tier } from "@/types/api";
   
   const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;
   const SEATS_PER_ROW = 12;
   const SEAT_ID_BASE = 1000;
      const CURRENCY = "GBP";
   
   /* Stands in for the seat_tier table from migration V6. Same three codes, same
      uplifts, so a seat costs the same here as it does against Postgres. */
   const SEAT_TIERS: Record<Tier, { displayName: string; priceDeltaMinor: number }> = {
     NORMAL: { displayName: "Normal", priceDeltaMinor: 0 },
     PREMIUM: { displayName: "Premium", priceDeltaMinor: 250 },
     EXECUTIVE: { displayName: "Executive", priceDeltaMinor: 500 },
   };
   
   /* The CASE from V6's backfill. This is the one place the mock is allowed to
      derive a tier from a row letter, because here it is standing in for the
      seed data rather than guessing at it. */
   function tierForRow(rowLabel: string): Tier {
     if (rowLabel <= "E") return "NORMAL";
     if (rowLabel <= "H") return "PREMIUM";
     return "EXECUTIVE";
   }
   
   /* ------------------------------------------------------------------ seats */
   
      export interface SeatPosition {
     id: number;
     rowLabel: string;
     seatNumber: number;
     tier: Tier;
   }
   
   export const SEATS: SeatPosition[] = ROWS.flatMap((rowLabel, rowIndex) =>
     Array.from({ length: SEATS_PER_ROW }, (_, i) => ({
       id: SEAT_ID_BASE + rowIndex * SEATS_PER_ROW + (i + 1),
       rowLabel,
       seatNumber: i + 1,
       tier: tierForRow(rowLabel),
     })),
   );
   
   /* The pricing rule from the seat_availability view: the showtime's base plus
      the tier's uplift. One function, used by both the seat map and the booking,
      so the displayed price and the charged price cannot drift. */
   export function seatPriceMinor(showtime: Showtime, seat: SeatPosition): number {
     return showtime.priceMinor + SEAT_TIERS[seat.tier].priceDeltaMinor;
   }
   
   export const SEATS_TOTAL = SEATS.length;
   
   export function seatById(seatId: number): SeatPosition | undefined {
     return SEATS.find((s) => s.id === seatId);
   }
   
   /* -------------------------------------------------------------- showtimes */
   
   /* Films are invented. Real titles drag in real posters, which the studios own,
      and nothing about this project needs them to be real. */
   function buildShowtimes(): Showtime[] {
     const films = [
       { title: "The Long Quiet", runtime: 128 },
       { title: "Saltwater", runtime: 112 },
       { title: "Paper Moons", runtime: 99 },
     ];
   
     const midnight = new Date();
     midnight.setUTCHours(0, 0, 0, 0);
   
     const slots = [
       { film: 0, screen: 1, hour: 13, minute: 10, priceMinor: 1150 },
       { film: 0, screen: 1, hour: 15, minute: 50, priceMinor: 1150 },
       { film: 0, screen: 3, hour: 18, minute: 40, priceMinor: 1150 },
       { film: 0, screen: 3, hour: 21, minute: 15, priceMinor: 1150 },
       { film: 1, screen: 2, hour: 14, minute: 20, priceMinor: 1400 },
       { film: 1, screen: 2, hour: 17, minute: 30, priceMinor: 1400 },
       { film: 1, screen: 2, hour: 20, minute: 45, priceMinor: 1400 },
       { film: 2, screen: 4, hour: 11, minute: 0, priceMinor: 1150 },
       { film: 2, screen: 4, hour: 13, minute: 30, priceMinor: 1150 },
     ];
   
     return slots.map((slot, index) => {
       const startsAt = new Date(midnight);
       startsAt.setUTCHours(slot.hour, slot.minute, 0, 0);
   
       /* Anything already past rolls to tomorrow, so the list never shows a
          screening that has been and gone. */
       if (startsAt.getTime() < Date.now()) {
         startsAt.setUTCDate(startsAt.getUTCDate() + 1);
       }
   
       return {
         id: index + 1,
         filmTitle: films[slot.film].title,
         screenName: `Screen ${slot.screen}`,
         startsAt: startsAt.toISOString(),
         runtimeMinutes: films[slot.film].runtime,
         priceMinor: slot.priceMinor,
         currency: CURRENCY,
         seatsAvailable: 0, // filled in by the handler
         seatsTotal: SEATS_TOTAL,
       };
     });
   }
   
   export const SHOWTIMES: Showtime[] = buildShowtimes();
   
   export function findShowtime(showtimeId: number): Showtime | undefined {
     return SHOWTIMES.find((s) => s.id === showtimeId);
   }
   
   /* ------------------------------------------------- pre-existing occupancy */
   
   /* Showtime 5 is seeded full so the sold-out card is always visible. */
   const SOLD_OUT_SHOWTIMES = new Set([5]);
   
   /* Seats taken before you arrived, so the map isn't empty. Derived from the ids
      rather than random, so a reload shows the same cinema. */
   function seededBooked(showtimeId: number, seatId: number): boolean {
     if (SOLD_OUT_SHOWTIMES.has(showtimeId)) return true;
     return (seatId * 7 + showtimeId * 13) % 11 < 3;
   }
   
   /* Other people's live holds. Permanent here, since there is nobody to let
      them lapse. */
   function seededHeld(showtimeId: number, seatId: number): boolean {
     return !seededBooked(showtimeId, seatId) && (seatId * 5 + showtimeId * 3) % 17 === 0;
   }
   
   /* ----------------------------------------------------------- live state */
   
   interface HoldRecord {
     holdId: string;
     showtimeId: number;
     seatId: number;
     expiresAt: number; // epoch ms
     convertedAt: number | null;
   }
   
   const holds = new Map<string, HoldRecord>();
   const bookings = new Map<string, Booking>();
   const bookedKeys = new Set<string>(); // "showtimeId:seatId" booked this session
   
   const key = (showtimeId: number, seatId: number) => `${showtimeId}:${seatId}`;
   
   export const getHoldRecord = (holdId: string) => holds.get(holdId);
   export const getBooking = (reference: string) => bookings.get(reference);
   
   function isBooked(showtimeId: number, seatId: number): boolean {
     return bookedKeys.has(key(showtimeId, seatId)) || seededBooked(showtimeId, seatId);
   }
   
   /* Active means not yet converted and not yet past its expiry. */
   function activeHold(showtimeId: number, seatId: number): HoldRecord | undefined {
     const now = Date.now();
     for (const hold of holds.values()) {
       if (
         hold.showtimeId === showtimeId &&
         hold.seatId === seatId &&
         hold.convertedAt === null &&
         hold.expiresAt > now
       ) {
         return hold;
       }
     }
     return undefined;
   }
   
   /* The state machine, in one expression. Nothing stores "HELD" against a seat:
      it is worked out per request from bookings and unexpired holds, which is why
      a hold expires here with no timer and no cleanup job. Same rule as the CASE
      statement in docs/api-contract.md. */
   export function seatStatus(showtimeId: number, seatId: number): SeatStatus {
     if (isBooked(showtimeId, seatId)) return "BOOKED";
     if (seededHeld(showtimeId, seatId)) return "HELD";
     if (activeHold(showtimeId, seatId)) return "HELD";
     return "AVAILABLE";
   }
   
      /* The handler validates the showtime before calling this, so findShowtime
      cannot miss here. The fallback exists to satisfy the type, not a real case. */
   export function seatMapFor(showtimeId: number): Seat[] {
     const showtime = findShowtime(showtimeId);
     return SEATS.map((seat) => ({
       id: seat.id,
       rowLabel: seat.rowLabel,
       seatNumber: seat.seatNumber,
       status: seatStatus(showtimeId, seat.id),
       tier: seat.tier,
       tierName: SEAT_TIERS[seat.tier].displayName,
       priceMinor: showtime ? seatPriceMinor(showtime, seat) : 0,
       currency: showtime?.currency ?? CURRENCY,
     }));
   }
   
   export function seatsAvailableFor(showtimeId: number): number {
     return SEATS.reduce(
       (n, seat) => n + (seatStatus(showtimeId, seat.id) === "AVAILABLE" ? 1 : 0),
       0,
     );
   }
   
   /* --------------------------------------------------------------- writes */
   
   export type HoldOutcome =
     | { ok: true; hold: HoldRecord; seat: SeatPosition }
     | { ok: false; reason: "no-such-showtime" | "no-such-seat" | "unavailable" };
   
   export function createHold(showtimeId: number, seatId: number): HoldOutcome {
     if (!findShowtime(showtimeId)) return { ok: false, reason: "no-such-showtime" };
   
     const seat = seatById(seatId);
     if (!seat) return { ok: false, reason: "no-such-seat" };
   
     if (seatStatus(showtimeId, seatId) !== "AVAILABLE") {
       return { ok: false, reason: "unavailable" };
     }
   
     const hold: HoldRecord = {
       /* v4 here; the real service issues v7 so the index stays time-ordered. */
       holdId: crypto.randomUUID(),
       showtimeId,
       seatId,
       expiresAt: Date.now() + HOLD_TTL_SECONDS * 1000,
       convertedAt: null,
     };
     holds.set(hold.holdId, hold);
     return { ok: true, hold, seat };
   }
   
   export type ReleaseOutcome =
     | { ok: true }
     | { ok: false; reason: "no-such-hold" | "already-converted" };
   
   /* Pushing expiry into the past is enough to free the seat, because status is
      derived from expires_at. Nothing else needs updating. */
   export function releaseHold(holdId: string): ReleaseOutcome {
     const hold = holds.get(holdId);
     if (!hold) return { ok: false, reason: "no-such-hold" };
     if (hold.convertedAt !== null) return { ok: false, reason: "already-converted" };
     hold.expiresAt = Date.now() - 1;
     return { ok: true };
   }
   
   export type BookingOutcome =
     | { ok: true; booking: Booking }
     | { ok: false; reason: "no-such-hold" | "expired" | "already-converted" };
   
   export function createBooking(holdId: string): BookingOutcome {
     const hold = holds.get(holdId);
     if (!hold) return { ok: false, reason: "no-such-hold" };
     if (hold.convertedAt !== null) return { ok: false, reason: "already-converted" };
     if (hold.expiresAt <= Date.now()) return { ok: false, reason: "expired" };
   
     const showtime = findShowtime(hold.showtimeId);
     const seat = seatById(hold.seatId);
     if (!showtime || !seat) return { ok: false, reason: "no-such-hold" };
   
     hold.convertedAt = Date.now();
     bookedKeys.add(key(hold.showtimeId, hold.seatId));
   
     const booking: Booking = {
       bookingReference: newBookingReference(),
       showtimeId: showtime.id,
       filmTitle: showtime.filmTitle,
       screenName: showtime.screenName,
       startsAt: showtime.startsAt,
       seat: { rowLabel: seat.rowLabel, seatNumber: seat.seatNumber },
        /* Same fix as BookingService: the seat's price, not the showtime's base.
          Charging the base here would undercharge every Premium and Executive
          seat, and the demo deploy runs on this code. */
       pricePaidMinor: seatPriceMinor(showtime, seat),
       currency: showtime.currency,
       bookedAt: new Date().toISOString(),
     };
     bookings.set(booking.bookingReference, booking);
     return { ok: true, booking };
   }
   
   /* No I, L, O, U, 0 or 1, so the code survives being read out over a phone. */
   const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
   
   function newBookingReference(): string {
     const bytes = crypto.getRandomValues(new Uint8Array(6));
     const code = Array.from(bytes, (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join("");
     return `SB-${code}`;
   }
   
   export function remainingSeconds(expiresAt: number): number {
     return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));}