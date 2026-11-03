package com.mohit.screenbook.booking;

import java.time.Instant;

public record BookingResponse(
        String bookingReference,
        long showtimeId,
        String filmTitle,
        String screenName,
        Instant startsAt,
        SeatRef seat,
        int pricePaidMinor,
        String currency,
        Instant bookedAt
) {
    /** Nested, because the contract nests it: "seat": { rowLabel, seatNumber }. */
    public record SeatRef(String rowLabel, int seatNumber) {
    }
}