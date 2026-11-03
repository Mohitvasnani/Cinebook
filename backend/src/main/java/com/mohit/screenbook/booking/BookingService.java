package com.mohit.screenbook.booking;

import com.mohit.screenbook.catalogue.Showtime;
import com.mohit.screenbook.catalogue.ShowtimeRepository;
import com.mohit.screenbook.common.HoldAlreadyConvertedException;
import com.mohit.screenbook.common.HoldExpiredException;
import com.mohit.screenbook.common.NotFoundException;
import com.mohit.screenbook.hold.SeatHold;
import com.mohit.screenbook.hold.SeatHoldRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Service
public class BookingService {

    private final SeatHoldRepository holds;
    private final ShowtimeRepository showtimes;
    private final BookingRepository bookings;
    private final BookingQuery bookingQuery;
    private final Clock clock;

    BookingService(SeatHoldRepository holds, ShowtimeRepository showtimes,
                   BookingRepository bookings, BookingQuery bookingQuery, Clock clock) {
        this.holds = holds;
        this.showtimes = showtimes;
        this.bookings = bookings;
        this.bookingQuery = bookingQuery;
        this.clock = clock;
    }

    /**
     * Converts a hold into a booking.
     *
     * The state check below is the readable rule; it is not what makes this
     * safe. Two requests can both read an ACTIVE hold before either writes.
     * What makes it safe is @Version on the hold: the UPDATE carries
     * AND version = ?, so the second writer affects zero rows and loses.
     */
    @Transactional
    public BookingResponse confirm(UUID holdId) {
        SeatHold hold = holds.findById(holdId)
                .orElseThrow(() -> new NotFoundException(
                        "No hold with id %s.".formatted(holdId)));

        Instant now = clock.instant();
        SeatHold.State state = hold.stateAt(now);
        if (state == SeatHold.State.CONVERTED) {
            throw new HoldAlreadyConvertedException(
                    "That hold has already been converted into a booking.");
        }
        if (state != SeatHold.State.ACTIVE) {
            throw new HoldExpiredException();
        }

        Showtime showtime = showtimes.findById(hold.getShowtimeId())
                .orElseThrow(() -> new IllegalStateException(
                        "Hold %s references a showtime that does not exist".formatted(holdId)));

        hold.markBooked(now);

        /* Price and currency are copied, not referenced. They record what was
           charged, so a later price change on the showtime does not rewrite
           history. */
        Booking booking = Booking.of(
                hold.getId(), hold.getShowtimeId(), hold.getSeatId(),
                showtime.getPriceMinor(), showtime.getCurrency(),
                BookingReference.generate(), now);

        try {
            /* saveAndFlush, not save. JPA would otherwise defer both statements
               to commit, which happens after this method returns, and the
               exceptions below could not be caught here at all. The hold goes
               first so a double submit is caught by the version rather than by
               a constraint, which gives the more accurate error. */
            holds.saveAndFlush(hold);
            bookings.saveAndFlush(booking);
        } catch (OptimisticLockingFailureException e) {
            throw new HoldAlreadyConvertedException(
                    "That hold has already been converted into a booking.");
        } catch (DataIntegrityViolationException e) {
            /* The backstop fired: either UNIQUE (hold_id) or
               UNIQUE (showtime_id, seat_id) on booking. Reaching here means the
               version check above was bypassed somehow, so the database saved
               us. Same answer to the client either way. */
            throw new HoldAlreadyConvertedException(
                    "That hold has already been converted into a booking.");
        }

        return bookingQuery.byReference(booking.getReference());
    }

    @Transactional(readOnly = true)
    public BookingResponse find(String reference) {
        return bookingQuery.byReference(reference);
    }
}