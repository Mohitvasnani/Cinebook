package com.mohit.screenbook.booking;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * A booking never changes once written, so every column is updatable = false
 * and there is no @Version. Cancellation is out of scope, and if it arrives it
 * is a new row, not an edit.
 *
 * One booking covers every seat on its hold. The seats and their prices live
 * in booking_seat; the parent keeps only what is true of the whole
 * transaction.
 */
@Entity
@Table(name = "booking")
public class Booking {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private String reference;

    @Column(name = "hold_id", nullable = false, updatable = false)
    private UUID holdId;

    @Column(name = "showtime_id", nullable = false, updatable = false)
    private Long showtimeId;

    /**
     * The booked seats with their prices.
     *
     * Same mapping choice as SeatHold: an owned element collection, because
     * these rows have no identity. Immutable after construction, so the
     * wholesale rewrite that element collections do on change never happens.
     *
     * LAZY, so loading a booking to check its reference does not drag the seat
     * rows. Anything that needs them reads them inside the transaction;
     * BookingQuery goes to SQL directly rather than through here.
     */
    @ElementCollection
    @CollectionTable(
            name = "booking_seat",
            joinColumns = @JoinColumn(name = "booking_id")
    )
    private Set<BookingSeat> seats = new LinkedHashSet<>();

    /**
     * One currency for the whole booking. One transaction, one currency:
     * putting it on each seat would let a single booking be half in pounds.
     */
    @Column(nullable = false, updatable = false)
    private String currency;

    @Column(name = "booked_at", nullable = false, updatable = false)
    private Instant bookedAt;

    protected Booking() {
    }

    /**
     * Takes plain values rather than a SeatHold, so this package does not
     * depend on the hold package.
     *
     * Prices arrive as a map from seat id to price so a seat cannot be listed
     * twice by construction, and so the caller has to have resolved a price
     * for every seat before it gets here. Passing two parallel collections
     * would allow a seat with no price.
     */
    public static Booking of(UUID holdId, Long showtimeId,
                             Map<Long, Integer> pricesBySeatId, String currency,
                             String reference, Instant now) {
        if (pricesBySeatId == null || pricesBySeatId.isEmpty()) {
            throw new IllegalArgumentException("A booking must cover at least one seat");
        }

        Booking booking = new Booking();
        booking.holdId = holdId;
        booking.showtimeId = showtimeId;
        booking.currency = currency;
        booking.reference = reference;
        booking.bookedAt = now;
        pricesBySeatId.forEach((seatId, priceMinor) ->
                booking.seats.add(BookingSeat.of(seatId, showtimeId, priceMinor)));
        return booking;
    }

    public UUID getId() { return id; }
    public String getReference() { return reference; }
    public UUID getHoldId() { return holdId; }
    public Long getShowtimeId() { return showtimeId; }
    public String getCurrency() { return currency; }
    public Instant getBookedAt() { return bookedAt; }

    /** Unmodifiable: a booking's seats are fixed the moment it is written. */
    public Set<BookingSeat> getSeats() {
        return Set.copyOf(seats);
    }

    /**
     * Derived, never stored. A stored total is a second place for the truth to
     * live and a chance for it to drift from the lines it summarises.
     * BookingQuery does the same sum in SQL for reads, because that path never
     * loads the entity.
     */
    public int totalMinor() {
        return seats.stream().mapToInt(BookingSeat::getPricePaidMinor).sum();
    }
}