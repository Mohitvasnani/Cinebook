package com.mohit.screenbook.booking;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.util.Objects;

/**
 * One seat on a booking, with what it actually cost.
 *
 * @Embeddable for the same reason HoldSeat is: no identity of its own, cannot
 * exist without its booking, nothing points at one, and the table's primary
 * key is (booking_id, seat_id).
 */
@Embeddable
public class BookingSeat {

    @Column(name = "seat_id", nullable = false, updatable = false)
    private Long seatId;

    /**
     * The parent's showtime, copied down so booking_seat can carry
     * UNIQUE (showtime_id, seat_id). That constraint is the one line the whole
     * project rests on: two people cannot both own the same seat at the same
     * screening. The composite foreign key on (booking_id, showtime_id) is
     * what keeps this copy honest.
     */
    @Column(name = "showtime_id", nullable = false, updatable = false)
    private Long showtimeId;

    /**
     * What was charged for this seat, recorded rather than referenced, so a
     * later price change does not rewrite history. No total is stored
     * anywhere: the total is the sum of these, which cannot disagree with its
     * own lines.
     */
    @Column(name = "price_paid_minor", nullable = false, updatable = false)
    private int pricePaidMinor;

    protected BookingSeat() {
        // Hibernate builds instances by reflection and needs a no-arg
        // constructor.
    }

    static BookingSeat of(Long seatId, Long showtimeId, int pricePaidMinor) {
        BookingSeat booked = new BookingSeat();
        booked.seatId = seatId;
        booked.showtimeId = showtimeId;
        booked.pricePaidMinor = pricePaidMinor;
        return booked;
    }

    public Long getSeatId() { return seatId; }
    public int getPricePaidMinor() { return pricePaidMinor; }

    Long getShowtimeId() { return showtimeId; }

    /**
     * Identity is (seat, showtime), deliberately excluding the price.
     *
     * Those two are what the table's primary key and unique constraint are
     * built on, so two elements that agree on them are the same row as far as
     * the database is concerned. Including the price would let this Set hold
     * two elements Postgres then rejects as duplicates, turning a bug that
     * fails fast in memory into one that fails at flush time with a constraint
     * violation.
     */
    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof BookingSeat that)) return false;
        return Objects.equals(seatId, that.seatId)
                && Objects.equals(showtimeId, that.showtimeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(seatId, showtimeId);
    }
}