package com.mohit.screenbook.catalogue;

public record SeatView(long id, String rowLabel, int seatNumber, SeatStatus status) {
}