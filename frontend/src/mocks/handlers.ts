/* The mock implementation of docs/api-contract.md. These run in a service
   worker, so the app's fetch calls are intercepted before they leave the page.
   Status codes and error bodies match the contract exactly: when the Spring
   service replaces this, no component changes. */

   import { delay, http, HttpResponse } from "msw";

   import { HOLD_TTL_SECONDS } from "@/services/apiConfig";
   import { PROBLEM_BASE, type ProblemDetail } from "@/services/problemDetails";
   import type { Hold, HoldDetail, HoldStatus, SeatMap, Showtime } from "@/types/api";
   import {
     createBooking,
     createHold,
     findShowtime,
     getBooking,
     getHoldRecord,
     releaseHold,
     remainingSeconds,
     seatById,
     seatMapFor,
     seatsAvailableFor,
     SHOWTIMES,
   } from "./db";
   
   /* Enough latency that loading states are real rather than theoretical. */
   const LATENCY_MS = 180;
   
   function problem(
     slug: string,
     status: number,
     title: string,
     detail: string,
     instance: string,
     extra: Record<string, unknown> = {},
   ): ProblemDetail {
     return { type: `${PROBLEM_BASE}/${slug}`, title, status, detail, instance, ...extra };
   }
   
   const problemResponse = (body: ProblemDetail) =>
     HttpResponse.json(body, {
       status: body.status,
       headers: { "Content-Type": "application/problem+json" },
     });
   
   const notFound = (instance: string, detail: string) =>
     problemResponse(problem("not-found", 404, "Not found", detail, instance));
   
   export const handlers = [
     http.get("/api/showtimes", async () => {
       await delay(LATENCY_MS);
       const body: Showtime[] = SHOWTIMES.map((showtime) => ({
         ...showtime,
         seatsAvailable: seatsAvailableFor(showtime.id),
       }));
       return HttpResponse.json(body);
     }),
   
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
   
     http.post("/api/holds", async ({ request }) => {
       await delay(LATENCY_MS);
   
       let payload: { showtimeId?: unknown; seatId?: unknown };
       try {
         payload = (await request.json()) as typeof payload;
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
   
     http.get("/api/holds/:holdId", async ({ params }) => {
       await delay(LATENCY_MS);
       const holdId = String(params.holdId);
       const hold = getHoldRecord(holdId);
       const seat = hold ? seatById(hold.seatId) : undefined;
   
       if (!hold || !seat) {
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
   
     http.delete("/api/holds/:holdId", async ({ params }) => {
       await delay(LATENCY_MS);
       const holdId = String(params.holdId);
       const outcome = releaseHold(holdId);
   
       if (!outcome.ok) {
         if (outcome.reason === "already-converted") {
           return problemResponse(
             problem(
               "hold-already-converted",
               409,
               "Hold already converted",
               "That hold is already a booking and cannot be released.",
               `/api/holds/${holdId}`,
             ),
           );
         }
         return notFound(`/api/holds/${holdId}`, `No hold with id ${holdId}.`);
       }
       return new HttpResponse(null, { status: 204 });
     }),
   
     http.post("/api/bookings", async ({ request }) => {
       await delay(LATENCY_MS);
   
       let payload: { holdId?: unknown };
       try {
         payload = (await request.json()) as typeof payload;
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
   
     http.get("/api/bookings/:reference", async ({ params }) => {
       await delay(LATENCY_MS);
       const reference = String(params.reference);
       const booking = getBooking(reference);
   
       if (!booking) {
         return notFound(
           `/api/bookings/${reference}`,
           `No booking with reference ${reference}.`,
         );
       }
       return HttpResponse.json(booking);
     }),
   ];