package com.mohit.screenbook.catalogue;

import java.util.List;

public record SeatMapResponse(long showtimeId, List<SeatView> seats) {
}