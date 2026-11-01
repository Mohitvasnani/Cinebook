package com.mohit.cinebook.hold;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.UuidGenerator;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "seat_hold")
public class SeatHold {

    /**
     * RELEASED is internal. The API reports it as EXPIRED, because from the
     * client's point of view the outcome is identical: the seat is free and
     * you start again.
     */
    public enum State { ACTIVE, EXPIRED, CONVERTED, RELEASED }

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "showtime_id", nullable = false, updatable = false)
    private Long showtimeId;

    @Column(name = "seat_id", nullable = false, updatable = false)
    private Long seatId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(name = "booked_at")
    private Instant bookedAt;

    @Column(name = "released_at")
    private Instant releasedAt;

    @Version
    private long version;

    protected SeatHold() {
    }

    /** The only way to create a hold. */
    public static SeatHold claim(Long showtimeId, Long seatId, Instant now, Duration ttl) {
        SeatHold hold = new SeatHold();
        hold.showtimeId = showtimeId;
        hold.seatId = seatId;
        hold.createdAt = now;
        hold.expiresAt = now.plus(ttl);
        return hold;
    }

    /**
     * The whole state machine, in one expression. Nothing stores the state;
     * it is worked out from three timestamps, which is the same rule the
     * availability query applies in SQL.
     */
    public State stateAt(Instant now) {
        if (bookedAt != null) return State.CONVERTED;
        if (releasedAt != null) return State.RELEASED;
        if (!expiresAt.isAfter(now)) return State.EXPIRED;
        return State.ACTIVE;
    }

    /**
     * Guards are a backstop, not the error path. The service checks the state
     * first and throws the exception that maps to the right problem type, so
     * this firing means a bug, not a user mistake.
     */
    public void markBooked(Instant now) {
        State state = stateAt(now);
        if (state != State.ACTIVE) {
            throw new IllegalStateException("Cannot book a hold in state " + state);
        }
        this.bookedAt = now;
    }

    public void release(Instant now) {
        State state = stateAt(now);
        if (state != State.ACTIVE) {
            throw new IllegalStateException("Cannot release a hold in state " + state);
        }
        this.releasedAt = now;
    }

    /** Never negative, so the client's countdown cannot start below zero. */
    public long remainingSeconds(Instant now) {
        return Math.max(0, Duration.between(now, expiresAt).toSeconds());
    }

    public UUID getId() { return id; }
    public Long getShowtimeId() { return showtimeId; }
    public Long getSeatId() { return seatId; }
    public Instant getExpiresAt() { return expiresAt; }
    public long getVersion() { return version; }
}