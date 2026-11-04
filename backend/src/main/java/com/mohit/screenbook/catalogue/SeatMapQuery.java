package com.mohit.screenbook.catalogue;

import com.mohit.screenbook.common.NotFoundException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.Collection;
import java.util.List;

@Repository
public class SeatMapQuery {

    private static final String SEAT_MAP = """
            SELECT seat_id, row_label, seat_number, status,
                   tier, tier_name, price_minor, currency
            FROM seat_availability
            WHERE showtime_id = :showtimeId
            ORDER BY row_label, seat_number
            """;
    private static final String SEATS_BY_ID = """
            SELECT seat_id, row_label, seat_number, status,
                   tier, tier_name, price_minor, currency
            FROM seat_availability
            WHERE showtime_id = :showtimeId
              AND seat_id IN (:seatIds)
            ORDER BY row_label, seat_number
            """;
    private static final String SEAT_PRICE = """
            SELECT price_minor, currency
            FROM seat_availability
            WHERE showtime_id = :showtimeId
              AND seat_id     = :seatId
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
                        SeatStatus.valueOf(rs.getString("status")),
                        rs.getString("tier"),
                        rs.getString("tier_name"),
                        rs.getInt("price_minor"),
                        rs.getString("currency")))
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


    /**
     * What this seat costs for this showtime. Like statusOf, deliberately has
     * no @Transactional: it is called from inside the booking transaction and
     * must read what that transaction can see.
     */
    public SeatPrice priceOf(long showtimeId, long seatId) {
        return jdbc.sql(SEAT_PRICE)
                .param("showtimeId", showtimeId)
                .param("seatId", seatId)
                .query((rs, rowNum) -> new SeatPrice(
                        rs.getInt("price_minor"),
                        rs.getString("currency")))
                .optional()
                .orElseThrow(() -> new IllegalStateException(
                        "Hold references seat %d / showtime %d, which the seat map does not have"
                                .formatted(seatId, showtimeId)));
    }
    /**
     * Several seats at once, with their status and price. One query rather than
     * one per seat, and ordered for display, so the claim path gets its
     * availability check and its response data from the same read.
     *
     * No @Transactional, same reason as statusOf: this runs inside the claim
     * transaction, after it has locked the seat rows, and must read what that
     * transaction can see.
     *
     * Fewer rows than seat ids means a seat id that is not in this showtime's
     * screen. The caller decides what that is: here it is a 404, because a seat
     * that was never there is a different mistake from a seat that has gone.
     */
    public List<SeatView> seatsByIds(long showtimeId, Collection<Long> seatIds) {
        return jdbc.sql(SEATS_BY_ID)
                .param("showtimeId", showtimeId)
                .param("seatIds", seatIds)
                .query((rs, rowNum) -> new SeatView(
                        rs.getLong("seat_id"),
                        rs.getString("row_label"),
                        rs.getInt("seat_number"),
                        SeatStatus.valueOf(rs.getString("status")),
                        rs.getString("tier"),
                        rs.getString("tier_name"),
                        rs.getInt("price_minor"),
                        rs.getString("currency")))
                .list();
    }

    private boolean showtimeExists(long showtimeId) {
        return Boolean.TRUE.equals(jdbc.sql(SHOWTIME_EXISTS)
                .param("showtimeId", showtimeId)
                .query(Boolean.class)
                .single());
    }
}