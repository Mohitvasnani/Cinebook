/**
 * The only place in the app that calls fetch.
 *
 * Every component goes through this, which is why switching from the mock to
 * the real API is one environment variable rather than a refactor.
 */

import { API_BASE_URL } from "./config";
import { ApiError, type ProblemDetail } from "./problem";
import type {
  Booking,
  Hold,
  HoldDetail,
  SeatMap,
  Showtime,
} from "./types";

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
    // The server should send problem details. If it sends something else
    // (a proxy error page, say), synthesise an equivalent so callers only
    // ever handle one error shape.
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

  return (await response.json()) as T;
}

export const api = {
  listShowtimes: () => request<Showtime[]>("/showtimes"),

  getSeatMap: (showtimeId: number) =>
    request<SeatMap>(`/showtimes/${showtimeId}/seats`),

  createHold: (showtimeId: number, seatId: number) =>
    request<Hold>("/holds", {
      method: "POST",
      body: JSON.stringify({ showtimeId, seatId }),
    }),

  getHold: (holdId: string) => request<HoldDetail>(`/holds/${holdId}`),

  createBooking: (holdId: string) =>
    request<Booking>("/bookings", {
      method: "POST",
      body: JSON.stringify({ holdId }),
    }),

  getBooking: (reference: string) =>
    request<Booking>(`/bookings/${reference}`),
};
