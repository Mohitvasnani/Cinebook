/**
 * Where the API lives, and whether we are talking to a real one.
 *
 * NEXT_PUBLIC_ variables are inlined into the browser bundle at build time, so
 * these are constants once built, not values read at runtime.
 */

export type ApiMode = "mock" | "live";

export const API_MODE: ApiMode =
  process.env.NEXT_PUBLIC_API_MODE === "live" ? "live" : "mock";

/** Empty in mock mode, so requests stay relative and the service worker sees them. */
export const API_BASE_URL: string =
  API_MODE === "live" ? (process.env.NEXT_PUBLIC_API_URL ?? "") : "";

export const isMockMode = API_MODE === "mock";

/** Hold lifetime. Mirrors the server value in docs/api-contract.md. */
export const HOLD_TTL_SECONDS = 300;
