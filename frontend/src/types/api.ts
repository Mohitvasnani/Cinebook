/* Shapes defined by docs/api-contract.md. Hand-written rather than generated,
   so the contract stays readable and any drift between client and server shows
   up here as a type error instead of a runtime surprise. */

   export type SeatStatus = "AVAILABLE" | "HELD" | "BOOKED";
   export type HoldStatus = "ACTIVE" | "EXPIRED" | "CONVERTED";
   
   export interface Showtime {
     id: number;
     filmTitle: string;
     screenName: string;
     startsAt: string;
     runtimeMinutes: number;
     /* Integer minor units (pence). Never a float. */
     priceMinor: number;
     currency: string;
     seatsAvailable: number;
     seatsTotal: number;
   }
   
     export type Tier = "NORMAL" | "PREMIUM" | "EXECUTIVE";

   export interface Seat {
     id: number;
     rowLabel: string;
     seatNumber: number;
     status: SeatStatus;
     tier: Tier;
     /* Display label for the tier, sent by the server so the code-to-text
        mapping lives in one place. */
     tierName: string;
     /* This seat's price for this showtime: the showtime's base plus the tier's
        uplift, resolved server-side. Integer minor units (pence). */
     priceMinor: number;
     currency: string;
   }
   
   export interface SeatMap {
     showtimeId: number;
     seats: Seat[];
   }
   
      export interface HeldSeat {
     seatId: number;
     rowLabel: string;
     seatNumber: number;
     tier: Tier;
     /* Integer minor units. Current price, not frozen: the booking is where a
        price is recorded as charged. */
     priceMinor: number;
   }
   
   export interface Hold {
     holdId: string;
     showtimeId: number;
     /* One to six seats, ordered by row then seat number. One hold covers all
        of them: it expires whole and converts whole. */
     seats: HeldSeat[];
     totalMinor: number;
     currency: string;
     /* Authoritative expiry instant, for display. */
     expiresAt: string;
     /* Remaining seconds, for the countdown. Counting down from this rather than
        diffing expiresAt means a skewed client clock cannot break the timer.
        One deadline for the whole hold, not one per seat. */
     ttlSeconds: number;
   }
   
   export interface HoldDetail extends Hold {
     status: HoldStatus;
   }
   
   export interface BookedSeat {
     rowLabel: string;
     seatNumber: number;
     tier: Tier;
     /* What was actually charged for this seat, so a later price change never
        rewrites a receipt. */
     pricePaidMinor: number;
   }
   
   export interface Booking {
     /* Short code meant to be read aloud, not the primary key. */
     bookingReference: string;
     showtimeId: number;
     filmTitle: string;
     screenName: string;
     startsAt: string;
     seats: BookedSeat[];
     totalPaidMinor: number;
     currency: string;
     bookedAt: string;
   }
   
   export interface CreateHoldRequest {
     showtimeId: number;
     /* 1 to 6, no repeats. A repeated seat is rejected rather than deduped. */
     seatIds: number[];
   }
   
   export interface CreateBookingRequest {
     /* Only the hold id. The hold already knows its seats and showtime, so
        sending them again would allow a combination that disagrees with the
        server. */
     holdId: string;
   }
   
   /**
    * One seat that could not be claimed, from the seats-unavailable 409's
    * unavailableSeats member. Only the lost seats are listed: requested minus
    * these is the set still wanted, which is also the retry payload.
    */
   export interface UnavailableSeat {
     seatId: number;
     rowLabel: string;
     seatNumber: number;
     status: SeatStatus;
   }