package com.mohit.screenbook.booking;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * A booking never changes once written, so every column is updatable = false
 * and there is no @Version. Cancellation is out of scope, and if it arrives it
 * is a new row, not an edit.
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

    @Column(name = "seat_id", nullable = false, updatable = false)
    private Long seatId;

    @Column(name = "price_paid_minor", nullable = false, updatable = false)
    private int pricePaidMinor;

    @Column(nullable = false, updatable = false)
    private String currency;

    @Column(name = "booked_at", nullable = false, updatable = false)
    private Instant bookedAt;

    protected Booking() {
    }

    /**
     * Takes plain values rather than a SeatHold, so this package does not
     * depend on the hold package. Price and currency are copied from the
     * showtime deliberately: they record what was charged, so a later price
     * change does not rewrite history.
     */
    public static Booking of(UUID holdId, Long showtimeId, Long seatId,
                             int pricePaidMinor, String currency,
                             String reference, Instant now) {
        Booking booking = new Booking();
        booking.holdId = holdId;
        booking.showtimeId = showtimeId;
        booking.seatId = seatId;
        booking.pricePaidMinor = pricePaidMinor;
        booking.currency = currency;
        booking.reference = reference;
        booking.bookedAt = now;
        return booking;
    }

    public UUID getId() { return id; }
    public String getReference() { return reference; }
    public UUID getHoldId() { return holdId; }
    public Long getShowtimeId() { return showtimeId; }
    public Long getSeatId() { return seatId; }
    public int getPricePaidMinor() { return pricePaidMinor; }
    public String getCurrency() { return currency; }
    public Instant getBookedAt() { return bookedAt; }
}