/**
 * Types transcribed from docs/api-contract.md.
 *
 * Hand-written rather than generated, so the contract stays readable and any
 * drift between client and server shows up here as a compile error.
 */

export type SeatStatus = "AVAILABLE" | "HELD" | "BOOKED";
export type HoldStatus = "ACTIVE" | "EXPIRED" | "CONVERTED";

export interface Showtime {
  id: number;
  filmTitle: string;
  screenName: string;
  /** ISO-8601 UTC, e.g. "2026-11-02T19:30:00Z" */
  startsAt: string;
  runtimeMinutes: number;
  /** Integer minor units (pence). Never a float. */
  priceMinor: number;
  currency: string;
  seatsAvailable: number;
  seatsTotal: number;
}

export interface Seat {
  id: number;
  rowLabel: string;
  seatNumber: number;
  status: SeatStatus;
}

export interface SeatMap {
  showtimeId: number;
  seats: Seat[];
}

/** Response from POST /api/holds. */
export interface Hold {
  holdId: string;
  showtimeId: number;
  seatId: number;
  rowLabel: string;
  seatNumber: number;
  /** Authoritative expiry instant. Use for display. */
  expiresAt: string;
  /** Remaining seconds. Use for the countdown, so a skewed client clock cannot break it. */
  ttlSeconds: number;
}

/** Response from GET /api/holds/{holdId}. Same shape plus a lifecycle status. */
export interface HoldDetail extends Hold {
  status: HoldStatus;
}

export interface Booking {
  /** Short human-readable code, e.g. "CB-7F3K2Q". Not the primary key. */
  bookingReference: string;
  showtimeId: number;
  filmTitle: string;
  screenName: string;
  startsAt: string;
  seat: { rowLabel: string; seatNumber: number };
  pricePaidMinor: number;
  currency: string;
  bookedAt: string;
}

export interface CreateHoldRequest {
  showtimeId: number;
  seatId: number;
}

export interface CreateBookingRequest {
  /** Only the hold ID. The hold already knows its seat and showtime. */
  holdId: string;
}
