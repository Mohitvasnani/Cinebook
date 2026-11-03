package com.mohit.screenbook.hold;

import com.mohit.screenbook.catalogue.Seat;
import com.mohit.screenbook.catalogue.SeatMapQuery;
import com.mohit.screenbook.catalogue.SeatRepository;
import com.mohit.screenbook.catalogue.SeatStatus;
import com.mohit.screenbook.common.NotFoundException;
import com.mohit.screenbook.common.SeatUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.mohit.screenbook.common.HoldAlreadyConvertedException;
import java.util.UUID;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

@Service
public class HoldService {

    private final SeatRepository seats;
    private final SeatMapQuery seatMap;
    private final SeatHoldRepository holds;
    private final Clock clock;
    private final Duration ttl;

    HoldService(SeatRepository seats, SeatMapQuery seatMap, SeatHoldRepository holds,
                Clock clock, @Value("${screenbook.hold.ttl-seconds}") long ttlSeconds) {
        this.seats = seats;
        this.seatMap = seatMap;
        this.holds = holds;
        this.clock = clock;
        this.ttl = Duration.ofSeconds(ttlSeconds);
    }

    /**
     * Claims one seat for the TTL.
     *
     * The three steps have to happen in this order and inside one transaction.
     * Locking the seat row first means that between our availability check and
     * our insert, no other transaction can run its own check for this seat.
     * The loser blocks on the lock, wakes up after the winner commits, sees the
     * seat is now HELD, and gets a 409.
     */
    @Transactional
    public HoldResponse claim(long showtimeId, long seatId) {

        // 1. Lock. Doubles as proof the seat exists.
        Seat seat = seats.findByIdForUpdate(seatId)
                .orElseThrow(() -> new NotFoundException(
                        "No seat with id %d.".formatted(seatId)));

        // 2. Read availability inside the lock. The view joins seat to showtime
        //    on screen_id, so a seat that is not in this showtime's screen, or
        //    an unknown showtime, returns no row and 404s here.
        SeatStatus status = seatMap.statusOf(showtimeId, seatId);
        if (status != SeatStatus.AVAILABLE) {
            throw new SeatUnavailableException(seatId, seat.label());
        }

        // 3. Insert. The lock is released when this transaction commits.
        Instant now = clock.instant();
        SeatHold hold = holds.save(SeatHold.claim(showtimeId, seatId, now, ttl));

        return new HoldResponse(
                hold.getId(), showtimeId, seatId,
                seat.getRowLabel(), seat.getSeatNumber(),
                hold.getExpiresAt(), ttl.toSeconds());
    }
    @Transactional(readOnly = true)
    public HoldDetailResponse get(UUID holdId) {
        SeatHold hold = holds.findById(holdId)
                .orElseThrow(() -> new NotFoundException(
                        "No hold with id %s.".formatted(holdId)));

        Seat seat = seats.findById(hold.getSeatId())
                .orElseThrow(() -> new IllegalStateException(
                        "Hold %s references a seat that does not exist".formatted(holdId)));

        Instant now = clock.instant();
        return new HoldDetailResponse(
                hold.getId(), hold.getShowtimeId(), hold.getSeatId(),
                seat.getRowLabel(), seat.getSeatNumber(),
                hold.getExpiresAt(), hold.remainingSeconds(now),
                apiStatus(hold.stateAt(now)));
    }

    /**
     * Hands a seat back early rather than leaving it locked for the rest of its
     * five minutes.
     */
    @Transactional
    public void release(UUID holdId) {
        Instant now = clock.instant();

        if (holds.releaseIfActive(holdId, now) == 1) {
            return;
        }

        /* Nothing was updated, so either there is no such hold or it had
           already ended. One read tells us which, and only on this cold path. */
        SeatHold hold = holds.findById(holdId)
                .orElseThrow(() -> new NotFoundException(
                        "No hold with id %s.".formatted(holdId)));

        if (hold.stateAt(now) == SeatHold.State.CONVERTED) {
            throw new HoldAlreadyConvertedException(
                    "That hold is already a booking and cannot be released.");
        }

        /* Expired or already released. The seat is free, which is what the
           caller wanted, so DELETE reports success instead of inventing a
           conflict. Deleting something already gone is not a failure. */
    }

    private static HoldStatus apiStatus(SeatHold.State state) {
        return switch (state) {
            case ACTIVE -> HoldStatus.ACTIVE;
            case CONVERTED -> HoldStatus.CONVERTED;
            case EXPIRED, RELEASED -> HoldStatus.EXPIRED;
        };
    }
}