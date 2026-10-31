import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

/** Imported dynamically by MockProvider, so MSW stays out of the live bundle. */
export const worker = setupWorker(...handlers);
