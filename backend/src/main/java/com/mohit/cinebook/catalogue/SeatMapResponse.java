package com.mohit.cinebook.catalogue;

import java.util.List;

public record SeatMapResponse(long showtimeId, List<SeatView> seats) {
}