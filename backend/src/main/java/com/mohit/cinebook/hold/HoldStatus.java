package com.mohit.cinebook.hold;

/**
 * The states the API reports. SeatHold.State also has RELEASED, which maps to
 * EXPIRED here: to a client the outcome is identical, the seat is free and you
 * start again, so a fourth value would mean a frontend change for no
 * behavioural difference.
 */
public enum HoldStatus {
    ACTIVE, EXPIRED, CONVERTED
}