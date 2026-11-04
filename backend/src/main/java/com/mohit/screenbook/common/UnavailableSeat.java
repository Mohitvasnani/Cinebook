package com.mohit.screenbook.common;

/**
 * One seat that was asked for and could not be claimed, with the state it is
 * in now. Enough for the client to flip that seat in place and say why it
 * went, without refetching the whole map.
 *
 * status is a String rather than the SeatStatus enum because that enum lives
 * in catalogue, and catalogue depends on this package. Taking the dependency
 * the other way would make it circular.
 */
public record UnavailableSeat(long seatId, String rowLabel, int seatNumber, String status) {
}