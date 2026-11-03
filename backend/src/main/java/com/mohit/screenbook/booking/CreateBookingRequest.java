package com.mohit.screenbook.booking;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Only the hold id. The hold already knows its seat and showtime, so re-sending
 * them would let a client submit a combination that disagrees with the server,
 * and the server would then have to decide which to trust.
 */
public record CreateBookingRequest(@NotNull(message = "is required") UUID holdId) {
}