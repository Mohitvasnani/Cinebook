package com.mohit.screenbook.booking;

import java.time.Instant;
import java.util.List;

/**
 * One booking, for the 201 body and for GET /api/bookings/{reference}.
 *
 * Seats are a list ordered by row then seat number, and each carries what it
 * actually cost. totalPaidMinor is their sum rather than a stored column, so
 * the total cannot disagree with the lines it summarises.
 */
public record BookingResponse(
        String bookingReference,
        long showtimeId,
        String filmTitle,
        String screenName,
        Instant startsAt,
        List<BookedSeat> seats,
        int totalPaidMinor,
        String currency,
        Instant bookedAt
) {
    /**
     * tier comes from the seat, which never changes. pricePaidMinor comes from
     * booking_seat, which records what was charged rather than what the seat
     * costs today.
     */
    public record BookedSeat(
            String rowLabel,
            int seatNumber,
            String tier,
            int pricePaidMinor
    ) {
    }
}