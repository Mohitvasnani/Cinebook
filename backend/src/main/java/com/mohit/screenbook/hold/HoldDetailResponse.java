package com.mohit.screenbook.hold;

import java.time.Instant;
import java.util.UUID;

/**
 * Unlike the 201 body, ttlSeconds here is the time remaining, so it shrinks
 * across calls. Duplicates HoldResponse's fields because records cannot extend
 * records, which is the price of them being final value types.
 */
public record HoldDetailResponse(
        UUID holdId,
        long showtimeId,
        long seatId,
        String rowLabel,
        int seatNumber,
        Instant expiresAt,
        long ttlSeconds,
        HoldStatus status
) {
}
