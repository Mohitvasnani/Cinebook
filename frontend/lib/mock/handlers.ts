/**
 * MSW request handlers: the mock implementation of docs/api-contract.md.
 *
 * These run in a service worker in the browser, so the app's fetch calls are
 * intercepted before they leave the page. Status codes and problem details
 * match the contract exactly, which is the point: when the Spring Boot service
 * replaces this, no component changes.
 */

import { delay, http, HttpResponse } from "msw";

import { problem } from "@/lib/api/problem";
import { HOLD_TTL_SECONDS } from "@/lib/api/config";
import type {
  Booking,
  CreateBookingRequest,
  CreateHoldRequest,
  Hold,
  HoldDetail,
  HoldStatus,
  SeatMap,
  Showtime,
} from "@/lib/api/types";
import {
  createBooking,
  createHold,
  findShowtime,
  getBooking,
  getHoldRecord,
  remainingSeconds,
  seatById,
  seatMapFor,
  seatsAvailableFor,
  SHOWTIMES,
} from "./db";

/** A touch of latency so loading states are real rather than theoretical. */
const LATENCY_MS = 180;

const problemResponse = (body: ReturnType<typeof problem>) =>
  HttpResponse.json(body, {
    status: body.status,
    headers: { "Content-Type": "application/problem+json" },
  });

const notFound = (instance: string, detail: string) =>
  problemResponse(problem("not-found", 404, "Not found", detail, instance));

export const handlers = [
  // 1. GET /api/showtimes
  http.get("/api/showtimes", async () => {
    await delay(LATENCY_MS);
    const body: Showtime[] = SHOWTIMES.map((showtime) => ({
      ...showtime,
      seatsAvailable: seatsAvailableFor(showtime.id),
    }));
    return HttpResponse.json(body);
  }),

  // 2. GET /api/showtimes/{showtimeId}/seats
  http.get("/api/showtimes/:showtimeId/seats", async ({ params }) => {
    await delay(LATENCY_MS);
    const showtimeId = Number(params.showtimeId);

    if (!Number.isInteger(showtimeId) || !findShowtime(showtimeId)) {
      return notFound(
        `/api/showtimes/${params.showtimeId}/seats`,
        `No showtime with id ${params.showtimeId}.`,
      );
    }

    const body: SeatMap = { showtimeId, seats: seatMapFor(showtimeId) };
    return HttpResponse.json(body);
  }),

  // 3. POST /api/holds
  http.post("/api/holds", async ({ request }) => {
    await delay(LATENCY_MS);

    let payload: Partial<CreateHoldRequest>;
    try {
      payload = (await request.json()) as Partial<CreateHoldRequest>;
    } catch {
      payload = {};
    }

    const { showtimeId, seatId } = payload;
    if (typeof showtimeId !== "number" || typeof seatId !== "number") {
      return problemResponse(
        problem(
          "validation-failed",
          422,
          "Validation failed",
          "showtimeId and seatId are required and must be numbers.",
          "/api/holds",
        ),
      );
    }

    const outcome = createHold(showtimeId, seatId);

    if (!outcome.ok) {
      if (outcome.reason === "unavailable") {
        const seat = seatById(seatId);
        const label = seat ? `${seat.rowLabel}${seat.seatNumber}` : `#${seatId}`;
        return problemResponse(
          problem(
            "seat-unavailable",
            409,
            "Seat unavailable",
            `Seat ${label} is already held or booked for this showtime.`,
            "/api/holds",
            { seatId },
          ),
        );
      }
      return notFound(
        "/api/holds",
        outcome.reason === "no-such-showtime"
          ? `No showtime with id ${showtimeId}.`
          : `No seat with id ${seatId}.`,
      );
    }

    const { hold, seat } = outcome;
    const body: Hold = {
      holdId: hold.holdId,
      showtimeId: hold.showtimeId,
      seatId: hold.seatId,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      expiresAt: new Date(hold.expiresAt).toISOString(),
      ttlSeconds: HOLD_TTL_SECONDS,
    };

    return HttpResponse.json(body, {
      status: 201,
      headers: { Location: `/api/holds/${hold.holdId}` },
    });
  }),

  // 4. GET /api/holds/{holdId}
  http.get("/api/holds/:holdId", async ({ params }) => {
    await delay(LATENCY_MS);
    const holdId = String(params.holdId);
    const hold = getHoldRecord(holdId);

    if (!hold) {
      return notFound(`/api/holds/${holdId}`, `No hold with id ${holdId}.`);
    }

    const seat = seatById(hold.seatId);
    if (!seat) {
      return notFound(`/api/holds/${holdId}`, `No hold with id ${holdId}.`);
    }

    const status: HoldStatus =
      hold.convertedAt !== null
        ? "CONVERTED"
        : hold.expiresAt > Date.now()
          ? "ACTIVE"
          : "EXPIRED";

    const body: HoldDetail = {
      holdId: hold.holdId,
      showtimeId: hold.showtimeId,
      seatId: hold.seatId,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      expiresAt: new Date(hold.expiresAt).toISOString(),
      ttlSeconds: remainingSeconds(hold.expiresAt),
      status,
    };
    return HttpResponse.json(body);
  }),

  // 5. POST /api/bookings
  http.post("/api/bookings", async ({ request }) => {
    await delay(LATENCY_MS);

    let payload: Partial<CreateBookingRequest>;
    try {
      payload = (await request.json()) as Partial<CreateBookingRequest>;
    } catch {
      payload = {};
    }

    if (typeof payload.holdId !== "string" || payload.holdId.length === 0) {
      return problemResponse(
        problem(
          "validation-failed",
          422,
          "Validation failed",
          "holdId is required.",
          "/api/bookings",
        ),
      );
    }

    const outcome = createBooking(payload.holdId);

    if (!outcome.ok) {
      switch (outcome.reason) {
        case "expired":
          return problemResponse(
            problem(
              "hold-expired",
              409,
              "Hold expired",
              "That hold expired before it was confirmed. The seat is available again.",
              "/api/bookings",
            ),
          );
        case "already-converted":
          return problemResponse(
            problem(
              "hold-already-converted",
              409,
              "Hold already converted",
              "That hold has already been converted into a booking.",
              "/api/bookings",
            ),
          );
        default:
          return notFound("/api/bookings", `No hold with id ${payload.holdId}.`);
      }
    }

    return HttpResponse.json(outcome.booking, { status: 201 });
  }),

  // 6. GET /api/bookings/{bookingReference}
  http.get("/api/bookings/:reference", async ({ params }) => {
    await delay(LATENCY_MS);
    const reference = String(params.reference);
    const booking: Booking | undefined = getBooking(reference);

    if (!booking) {
      return notFound(
        `/api/bookings/${reference}`,
        `No booking with reference ${reference}.`,
      );
    }
    return HttpResponse.json(booking);
  }),
];
