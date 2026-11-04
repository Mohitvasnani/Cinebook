package com.mohit.screenbook.catalogue;

/**
 * What one seat costs for one showtime: the showtime's base plus the tier's
 * delta, resolved by the seat_availability view. Not exposed over HTTP, it
 * exists so the booking path charges the same number the seat map displayed.
 */
public record SeatPrice(int priceMinor, String currency) {
}