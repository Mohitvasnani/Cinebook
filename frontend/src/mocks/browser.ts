import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

const worker = setupWorker(...handlers);

let starting: Promise<unknown> | null = null;

/* Start at most once per page load. React runs effects twice in development,
   and msw throws rather than ignoring a second start. Keeping the promise means
   the second caller waits on the first instead of beginning another. */
export function startWorker(): Promise<unknown> {
  starting ??= worker.start({ onUnhandledFrame: "bypass", quiet: true });
  return starting;
}