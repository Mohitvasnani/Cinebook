package com.mohit.screenbook.catalogue;

import com.mohit.screenbook.common.NotFoundException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public class SeatMapQuery {

    private static final String SEAT_MAP = """
            SELECT seat_id, row_label, seat_number, status
            FROM seat_availability
            WHERE showtime_id = :showtimeId
            ORDER BY row_label, seat_number
            """;

    private static final String SEAT_STATUS = """
            SELECT status
            FROM seat_availability
            WHERE showtime_id = :showtimeId
              AND seat_id     = :seatId
            """;

    private static final String SHOWTIME_EXISTS =
            "SELECT exists(SELECT 1 FROM showtime WHERE id = :showtimeId)";

    private final JdbcClient jdbc;

    SeatMapQuery(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public SeatMapResponse forShowtime(long showtimeId) {
        List<SeatView> seats = jdbc.sql(SEAT_MAP)
                .param("showtimeId", showtimeId)
                .query((rs, rowNum) -> new SeatView(
                        rs.getLong("seat_id"),
                        rs.getString("row_label"),
                        rs.getInt("seat_number"),
                        SeatStatus.valueOf(rs.getString("status"))))
                .list();

        /* An empty list is ambiguous: either no such showtime, or a real
           showtime whose screen has no seats. Only then is a second query
           worth paying for. */
        if (seats.isEmpty() && !showtimeExists(showtimeId)) {
            throw new NotFoundException("No showtime with id %d.".formatted(showtimeId));
        }
        return new SeatMapResponse(showtimeId, seats);
    }

    /**
     * One seat's status. Deliberately has no @Transactional of its own: it is
     * called from inside the claim transaction, after that transaction has
     * locked the seat row. Opening its own transaction here would read outside
     * the lock and the lock would protect nothing.
     */
    public SeatStatus statusOf(long showtimeId, long seatId) {
        return jdbc.sql(SEAT_STATUS)
                .param("showtimeId", showtimeId)
                .param("seatId", seatId)
                .query(String.class)
                .optional()
                .map(SeatStatus::valueOf)
                .orElseThrow(() -> new NotFoundException(
                        "No seat with id %d for showtime %d.".formatted(seatId, showtimeId)));
    }

    private boolean showtimeExists(long showtimeId) {
        return Boolean.TRUE.equals(jdbc.sql(SHOWTIME_EXISTS)
                .param("showtimeId", showtimeId)
                .query(Boolean.class)
                .single());
    }
}