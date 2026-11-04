package com.mohit.screenbook.common;

import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

/**
 * The 409 the race demo exists to produce.
 *
 * All or nothing: reaching here means no seat was claimed, not that some were.
 * Carries only the seats that were lost, in the order they will be displayed.
 * The client knows what it asked for, so requested minus unavailable is the
 * set still wanted, which is also the retry payload.
 */
public class SeatsUnavailableException extends ApiException {

    public SeatsUnavailableException(int requested, List<UnavailableSeat> unavailable) {
        super(HttpStatus.CONFLICT, Problems.SEATS_UNAVAILABLE, "Seats unavailable",
                detail(requested, unavailable),
                Map.of("unavailableSeats", unavailable));
    }

    /* Reads naturally for one seat and for several, because "1 of the 1 seats"
       is the kind of detail that makes an API look unfinished. */
    private static String detail(int requested, List<UnavailableSeat> unavailable) {
        if (requested == 1) {
            UnavailableSeat seat = unavailable.getFirst();
            return "Seat %s%d is already held or booked for this showtime."
                    .formatted(seat.rowLabel(), seat.seatNumber());
        }
        return "%d of the %d seats you chose have just gone."
                .formatted(unavailable.size(), requested);
    }
}