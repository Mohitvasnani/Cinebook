/**
 * RFC 9457 problem details, and the error type the client throws.
 *
 * Every failure from the API arrives in this shape, so components branch on a
 * stable identifier instead of pattern-matching on English prose.
 */

export const PROBLEM_BASE = "https://cinebook.dev/problems";

export interface ProblemDetail {
  /** URI identifying the problem kind, e.g. ".../problems/seat-unavailable" */
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  /** Problem details may carry extra members; seatId on seat-unavailable, for example. */
  [key: string]: unknown;
}

/** The slugs this client knows how to react to. */
export type ProblemSlug =
  | "seat-unavailable"
  | "hold-expired"
  | "hold-already-converted"
  | "not-found"
  | "validation-failed"
  | "unknown";

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
    this.status = problem.status;
    this.problem = problem;
  }

  /** Last path segment of the type URI, which is the part worth switching on. */
  get slug(): ProblemSlug {
    const segment = this.problem.type.split("/").pop() ?? "";
    switch (segment) {
      case "seat-unavailable":
      case "hold-expired":
      case "hold-already-converted":
      case "not-found":
      case "validation-failed":
        return segment;
      default:
        return "unknown";
    }
  }

  is(slug: ProblemSlug): boolean {
    return this.slug === slug;
  }
}

export function problem(
  slug: Exclude<ProblemSlug, "unknown">,
  status: number,
  title: string,
  detail: string,
  instance: string,
  extra: Record<string, unknown> = {},
): ProblemDetail {
  return { type: `${PROBLEM_BASE}/${slug}`, title, status, detail, instance, ...extra };
}
