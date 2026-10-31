/**
 * In-memory stand-in for the Postgres schema.
 *
 * The point of this file is that seat status is DERIVED, exactly as the real
 * SQL derives it (see docs/api-contract.md). Nothing stores "HELD" on a seat.
 * A hold that has passed its expiry simply stops counting, which is why holds
 * expire here with no timer, no cleanup job and no background task.
 *
 * State lives in module scope, so it survives client-side navigation and resets
 * on a full page reload.
 */

import { HOLD_TTL_SECONDS } from "@/lib/api/config";
import type { Booking, Seat, SeatStatus, Showtime } from "@/lib/api/types";

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;
const SEATS_PER_ROW = 12;
const SEAT_ID_BASE = 1000;

const PRICE_MINOR = 1250;
const CURRENCY = "GBP";

// ---------------------------------------------------------------- seats

export interface SeatPosition {
  id: number;
  rowLabel: string;
  seatNumber: number;
}

export const SEATS: SeatPosition[] = ROWS.flatMap((rowLabel, rowIndex) =>
  Array.from({ length: SEATS_PER_ROW }, (_, i) => ({
    id: SEAT_ID_BASE + rowIndex * SEATS_PER_ROW + (i + 1),
    rowLabel,
    seatNumber: i + 1,
  })),
);

export const SEATS_TOTAL = SEATS.length;

function seatById(seatId: number): SeatPosition | undefined {
  return SEATS.find((s) => s.id === seatId);
}

// ---------------------------------------------------------------- showtimes

/** Times are generated relative to now, so the demo never shows past dates. */
function buildShowtimes(): Showtime[] {
  const films = [
    { title: "Blade Runner 2049", runtime: 164 },
    { title: "Arrival", runtime: 116 },
    { title: "Dune: Part Two", runtime: 166 },
  ];

  const startOfTomorrow = new Date();
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
  startOfTomorrow.setUTCHours(0, 0, 0, 0);

  const slots = [
    { film: 0, screen: 1, hour: 14, minute: 0 },
    { film: 0, screen: 1, hour: 19, minute: 30 },
    { film: 1, screen: 2, hour: 17, minute: 15 },
    { film: 2, screen: 2, hour: 20, minute: 0 },
    { film: 2, screen: 3, hour: 21, minute: 45 },
  ];

  return slots.map((slot, index) => {
    const startsAt = new Date(startOfTomorrow);
    startsAt.setUTCHours(slot.hour, slot.minute, 0, 0);
    return {
      id: index + 1,
      filmTitle: films[slot.film].title,
      screenName: `Screen ${slot.screen}`,
      startsAt: startsAt.toISOString(),
      runtimeMinutes: films[slot.film].runtime,
      priceMinor: PRICE_MINOR,
      currency: CURRENCY,
      seatsAvailable: 0, // filled in by listShowtimes()
      seatsTotal: SEATS_TOTAL,
    };
  });
}

export const SHOWTIMES: Showtime[] = buildShowtimes();

export function findShowtime(showtimeId: number): Showtime | undefined {
  return SHOWTIMES.find((s) => s.id === showtimeId);
}

// ------------------------------------------------- pre-existing occupancy

/**
 * Seats that were already taken before you arrived, so the map does not look
 * empty. Deterministic from the IDs, so a reload shows the same cinema.
 */
function seededBooked(showtimeId: number, seatId: number): boolean {
  return (seatId * 7 + showtimeId * 13) % 11 < 3;
}

/** Other people's live holds. Permanent in the mock, since there is no one to let them lapse. */
function seededHeld(showtimeId: number, seatId: number): boolean {
  return !seededBooked(showtimeId, seatId) && (seatId * 5 + showtimeId * 3) % 17 === 0;
}

// ---------------------------------------------------------------- mutable state

interface HoldRecord {
  holdId: string;
  showtimeId: number;
  seatId: number;
  /** Epoch millis. */
  expiresAt: number;
  convertedAt: number | null;
}

const holds = new Map<string, HoldRecord>();
const bookings = new Map<string, Booking>();
/** "showtimeId:seatId" for seats booked during this session. */
const bookedKeys = new Set<string>();

const key = (showtimeId: number, seatId: number) => `${showtimeId}:${seatId}`;

export function getHoldRecord(holdId: string): HoldRecord | undefined {
  return holds.get(holdId);
}

export function getBooking(reference: string): Booking | undefined {
  return bookings.get(reference);
}

function isBooked(showtimeId: number, seatId: number): boolean {
  return bookedKeys.has(key(showtimeId, seatId)) || seededBooked(showtimeId, seatId);
}

/** An active hold is one not yet converted whose expiry is still in the future. */
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

/**
 * The whole state machine, in one expression. Compare with the CASE statement
 * in docs/api-contract.md: same rule, same ordering.
 */
export function seatStatus(showtimeId: number, seatId: number): SeatStatus {
  if (isBooked(showtimeId, seatId)) return "BOOKED";
  if (seededHeld(showtimeId, seatId)) return "HELD";
  if (activeHold(showtimeId, seatId)) return "HELD";
  return "AVAILABLE";
}

export function seatMapFor(showtimeId: number): Seat[] {
  return SEATS.map((seat) => ({
    id: seat.id,
    rowLabel: seat.rowLabel,
    seatNumber: seat.seatNumber,
    status: seatStatus(showtimeId, seat.id),
  }));
}

export function seatsAvailableFor(showtimeId: number): number {
  return SEATS.reduce(
    (count, seat) => count + (seatStatus(showtimeId, seat.id) === "AVAILABLE" ? 1 : 0),
    0,
  );
}

// ---------------------------------------------------------------- writes

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
    holdId: crypto.randomUUID(),
    showtimeId,
    seatId,
    expiresAt: Date.now() + HOLD_TTL_SECONDS * 1000,
    convertedAt: null,
  };
  holds.set(hold.holdId, hold);
  return { ok: true, hold, seat };
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
    pricePaidMinor: showtime.priceMinor,
    currency: showtime.currency,
    bookedAt: new Date().toISOString(),
  };
  bookings.set(booking.bookingReference, booking);
  return { ok: true, booking };
}

/** Crockford-ish base32: no I, L, O, U, 0 or 1, so it survives being read aloud. */
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function newBookingReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = Array.from(bytes, (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join("");
  return `CB-${code}`;
}

export function remainingSeconds(expiresAt: number): number {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

export { seatById };
