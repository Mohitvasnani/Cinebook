package com.mohit.cinebook.catalogue;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A physical seat in a screen. Read-only: seats are created by migration V3,
 * never by the application, so there are no setters.
 */
@Entity
@Table(name = "seat")
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "screen_id", nullable = false)
    private Long screenId;

    @Column(name = "row_label", nullable = false)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false)
    private int seatNumber;

    protected Seat() {
        // Hibernate builds instances by reflection and needs a no-arg
        // constructor. protected keeps application code from using it.
    }

    public Long getId() { return id; }
    public Long getScreenId() { return screenId; }
    public String getRowLabel() { return rowLabel; }
    public int getSeatNumber() { return seatNumber; }

    /** "A2", the form used in error messages and on the ticket. */
    public String label() {
        return rowLabel + seatNumber;
    }
}