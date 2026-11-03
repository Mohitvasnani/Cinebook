package com.mohit.screenbook.hold;

import java.time.Instant;
import java.util.UUID;

/**
 * expiresAt is authoritative and is what gets displayed. ttlSeconds lets the
 * browser count down against its own clock, so a user whose machine clock is
 * minutes out does not see a timer that starts at zero.
 */
public record HoldResponse(
        UUID holdId,
        long showtimeId,
        long seatId,
        String rowLabel,
        int seatNumber,
        Instant expiresAt,
        long ttlSeconds
) {
}