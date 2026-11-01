package com.mohit.cinebook.hold;

import jakarta.validation.constraints.NotNull;

/**
 * Boxed Long rather than long, deliberately. A primitive cannot be null, so an
 * absent field would arrive as 0 and @NotNull would never fire. Boxing is what
 * lets validation tell "missing" apart from "zero".
 */
public record CreateHoldRequest(
        @NotNull(message = "is required") Long showtimeId,
        @NotNull(message = "is required") Long seatId
) {
}