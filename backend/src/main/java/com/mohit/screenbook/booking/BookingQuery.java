package com.mohit.screenbook.booking;

import com.mohit.screenbook.common.NotFoundException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * One query serves both the 201 body and GET /api/bookings/{reference}, so the
 * two cannot drift apart. No @Transactional of its own: it joins whatever
 * transaction the caller is in, which matters because the POST path reads back
 * a booking it has only just inserted.
 */
@Repository
public class BookingQuery {

    /**
     * Joining booking to booking_seat fans the result out: one row per seat,
     * with the booking's own columns repeated on every row. That is normal for
     * a parent-child join and it is why the rows are folded back into one
     * response in Java below rather than mapped one-to-one.
     *
     * The alternative is two queries, a header and its seats. One query is
     * fewer round trips and the repetition costs almost nothing at six rows.
     *
     * Note price_paid_minor comes from bs, not b: the booking no longer has a
     * price, because a booking no longer has a single seat.
     */
    private static final String BY_REFERENCE = """
            SELECT b.reference         AS reference,
                   b.showtime_id       AS showtime_id,
                   f.title             AS film_title,
                   sc.name             AS screen_name,
                   st.starts_at        AS starts_at,
                   b.currency          AS currency,
                   b.booked_at         AS booked_at,
                   s.row_label         AS row_label,
                   s.seat_number       AS seat_number,
                   s.tier              AS tier,
                   bs.price_paid_minor AS price_paid_minor
            FROM booking b
            JOIN booking_seat bs ON bs.booking_id = b.id
            JOIN seat         s  ON s.id          = bs.seat_id
            JOIN showtime     st ON st.id         = b.showtime_id
            JOIN film         f  ON f.id          = st.film_id
            JOIN screen       sc ON sc.id         = st.screen_id
            WHERE b.reference = :reference
            ORDER BY s.row_label, s.seat_number
            """;

    private final JdbcClient jdbc;

    BookingQuery(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    BookingResponse byReference(String reference) {
        List<Row> rows = jdbc.sql(BY_REFERENCE)
                .param("reference", reference)
                .query((rs, rowNum) -> new Row(
                        rs.getString("reference"),
                        rs.getLong("showtime_id"),
                        rs.getString("film_title"),
                        rs.getString("screen_name"),
                        rs.getObject("starts_at", OffsetDateTime.class).toInstant(),
                        rs.getString("currency"),
                        rs.getObject("booked_at", OffsetDateTime.class).toInstant(),
                        rs.getString("row_label"),
                        rs.getInt("seat_number"),
                        rs.getString("tier"),
                        rs.getInt("price_paid_minor")))
                .list();

        /* No rows means no such reference. A booking cannot exist with zero
           seats, so an empty result is never a real booking with nothing on it. */
        if (rows.isEmpty()) {
            throw new NotFoundException(
                    "No booking with reference %s.".formatted(reference));
        }

        /* Every row carries the same booking columns, so the first one speaks
           for the header. */
        Row head = rows.getFirst();

        return new BookingResponse(
                head.reference(),
                head.showtimeId(),
                head.filmTitle(),
                head.screenName(),
                head.startsAt(),
                rows.stream()
                        .map(row -> new BookingResponse.BookedSeat(
                                row.rowLabel(), row.seatNumber(),
                                row.tier(), row.pricePaidMinor()))
                        .toList(),
                rows.stream().mapToInt(Row::pricePaidMinor).sum(),
                head.currency(),
                head.bookedAt());
    }

    /** One joined row, before the fan-out is folded back into one booking. */
    private record Row(
            String reference,
            long showtimeId,
            String filmTitle,
            String screenName,
            Instant startsAt,
            String currency,
            Instant bookedAt,
            String rowLabel,
            int seatNumber,
            String tier,
            int pricePaidMinor
    ) {
    }
}