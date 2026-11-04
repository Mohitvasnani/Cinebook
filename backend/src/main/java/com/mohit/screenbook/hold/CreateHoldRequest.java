package com.mohit.screenbook.hold;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Boxed Long rather than long, deliberately. A primitive cannot be null, so an
 * absent field would arrive as 0 and @NotNull would never fire. Boxing is what
 * lets validation tell "missing" apart from "zero".
 *
 * A List, not a Set. A Set would silently collapse [5, 5, 7] to [5, 7], and a
 * repeated seat is a client bug worth reporting rather than hiding. The
 * duplicate check lives in HoldService, because no standard constraint
 * annotation expresses it and a custom validator is a lot of ceremony for one
 * rule.
 *
 * The cap is enforced here, on the server. A cap that only exists in the UI is
 * not a cap.
 */
public record CreateHoldRequest(
        @NotNull(message = "is required") Long showtimeId,

        @NotNull(message = "is required")
        @Size(min = 1, max = 6, message = "must contain between 1 and 6 seats")
        List<@NotNull(message = "must not contain nulls") Long> seatIds
) {
}