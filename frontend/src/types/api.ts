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
   
   export interface Hold {
     holdId: string;
     showtimeId: number;
     seatId: number;
     rowLabel: string;
     seatNumber: number;
     /* Authoritative expiry instant, for display. */
     expiresAt: string;
     /* Remaining seconds, for the countdown. Counting down from this rather than
        diffing expiresAt means a skewed client clock cannot break the timer. */
     ttlSeconds: number;
   }
   
   export interface HoldDetail extends Hold {
     status: HoldStatus;
   }
   
   export interface Booking {
     /* Short code meant to be read aloud, not the primary key. */
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
     /* Only the hold id. The hold already knows its seat and showtime, so sending
        them again would allow a combination that disagrees with the server. */
     holdId: string;
   }