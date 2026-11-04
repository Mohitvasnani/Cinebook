/* The only place in the app that calls fetch. Everything else goes through
   api.*, which is what makes the mock-to-live switch a single env var. */

   import { API_BASE_URL } from "./apiConfig";
   import { ApiError, type ProblemDetail } from "./problemDetails";
   import type { Booking, Hold, HoldDetail, SeatMap, Showtime } from "@/types/api";
   
   async function request<T>(path: string, init?: RequestInit): Promise<T> {
     const response = await fetch(`${API_BASE_URL}/api${path}`, {
       ...init,
       headers: {
         Accept: "application/json",
         ...(init?.body ? { "Content-Type": "application/json" } : {}),
         ...init?.headers,
       },
     });
   
     if (!response.ok) {
       /* The API sends problem details. A proxy error page or a crashed process
          might not, so synthesise the same shape and keep one error type for
          callers to handle. */
       let detail: ProblemDetail;
       try {
         detail = (await response.json()) as ProblemDetail;
       } catch {
         detail = {
           type: "about:blank",
           title: response.statusText || "Request failed",
           status: response.status,
         };
       }
       throw new ApiError(detail);
     }
   
     /* DELETE returns 204 with no body, so there is nothing to parse. */
     if (response.status === 204) return undefined as T;
   
     return (await response.json()) as T;
   }
   
   export const api = {
     listShowtimes: () => request<Showtime[]>("/showtimes"),
   
     getSeatMap: (showtimeId: number) =>
       request<SeatMap>(`/showtimes/${showtimeId}/seats`),
   
          createHold: (showtimeId: number, seatIds: number[]) =>
       request<Hold>("/holds", {
         method: "POST",
         body: JSON.stringify({ showtimeId, seatIds }),
       }),
   
     getHold: (holdId: string) => request<HoldDetail>(`/holds/${holdId}`),
   
     /* Hand a seat back before the hold lapses, rather than leaving it locked for
        the rest of its five minutes. */
     releaseHold: (holdId: string) =>
       request<void>(`/holds/${holdId}`, { method: "DELETE" }),
   
     createBooking: (holdId: string) =>
       request<Booking>("/bookings", {
         method: "POST",
         body: JSON.stringify({ holdId }),
       }),
   
     getBooking: (reference: string) => request<Booking>(`/bookings/${reference}`),
   };