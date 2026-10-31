/* NEXT_PUBLIC_ values are substituted at build time, so these are constants in
   the bundle rather than runtime lookups. */

   export type ApiMode = "mock" | "live";

   export const API_MODE: ApiMode =
     process.env.NEXT_PUBLIC_API_MODE === "live" ? "live" : "mock";
   
   /* Empty in mock mode, so requests stay relative and the service worker sees
      them before they leave the page. */
   export const API_BASE_URL: string =
     API_MODE === "live" ? (process.env.NEXT_PUBLIC_API_URL ?? "") : "";
   
   export const IS_MOCK = API_MODE === "mock";
   
   /* Mirrors the server value in docs/api-contract.md. */
   export const HOLD_TTL_SECONDS = 300;