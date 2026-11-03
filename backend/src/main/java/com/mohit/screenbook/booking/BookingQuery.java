package com.mohit.screenbook.booking;

import com.mohit.screenbook.common.NotFoundException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;

/**
 * One query serves both the 201 body and GET /api/bookings/{reference}, so the
 * two can't drift apart. No @Transactional of its own: it joins whatever
 * transaction the caller is in, which matters because the POST path reads back
 * a booking it has only just inserted.
 */
@Repository
public class BookingQuery {

    private static final String BY_REFERENCE = """
            SELECT b.reference        AS reference,
                   b.showtime_id      AS showtime_id,
                   f.title            AS film_title,
                   sc.name            AS screen_name,
                   st.starts_at       AS starts_at,
                   s.row_label        AS row_label,
                   s.seat_number      AS seat_number,
                   b.price_paid_minor AS price_paid_minor,
                   b.currency         AS currency,
                   b.booked_at        AS booked_at
            FROM booking b
            JOIN showtime st ON st.id = b.showtime_id
            JOIN film     f  ON f.id  = st.film_id
            JOIN screen   sc ON sc.id = st.screen_id
            JOIN seat     s  ON s.id  = b.seat_id
            WHERE b.reference = :reference
            """;

    private final JdbcClient jdbc;

    BookingQuery(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    BookingResponse byReference(String reference) {
        return jdbc.sql(BY_REFERENCE)
                .param("reference", reference)
                .query((rs, rowNum) -> new BookingResponse(
                        rs.getString("reference"),
                        rs.getLong("showtime_id"),
                        rs.getString("film_title"),
                        rs.getString("screen_name"),
                        rs.getObject("starts_at", OffsetDateTime.class).toInstant(),
                        new BookingResponse.SeatRef(
                                rs.getString("row_label"),
                                rs.getInt("seat_number")),
                        rs.getInt("price_paid_minor"),
                        rs.getString("currency"),
                        rs.getObject("booked_at", OffsetDateTime.class).toInstant()))
                .optional()
                .orElseThrow(() -> new NotFoundException(
                        "No booking with reference %s.".formatted(reference)));
    }
}