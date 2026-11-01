package com.mohit.cinebook.common;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * The 409 that the race demo exists to produce. Carries seatId as an extra
 * member so the client can flip that one seat without refetching the map.
 */
public class SeatUnavailableException extends ApiException {

    public SeatUnavailableException(long seatId, String seatLabel) {
        super(HttpStatus.CONFLICT, Problems.SEAT_UNAVAILABLE, "Seat unavailable",
                "Seat %s is already held or booked for this showtime.".formatted(seatLabel),
                Map.of("seatId", seatId));
    }
}
