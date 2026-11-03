package com.mohit.screenbook.catalogue;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * The read side. Plain SQL rather than JPA, because this response is a join
 * across three tables plus two aggregates and matches no entity. Writing the
 * join is clearer than persuading Hibernate to produce it.
 */
@Repository
public class ShowtimeQuery {

    private static final String UPCOMING = """
            SELECT st.id              AS id,
                   f.title            AS film_title,
                   sc.name            AS screen_name,
                   st.starts_at       AS starts_at,
                   f.runtime_minutes  AS runtime_minutes,
                   st.price_minor     AS price_minor,
                   st.currency        AS currency,

                   (SELECT count(*) FROM seat s
                     WHERE s.screen_id = st.screen_id)          AS seats_total,

                   (SELECT count(*) FROM seat s
                     WHERE s.screen_id = st.screen_id)
                     - (SELECT count(*) FROM booking b
                         WHERE b.showtime_id = st.id)
                     - (SELECT count(*) FROM seat_hold h
                         WHERE h.showtime_id = st.id
                           AND h.booked_at   IS NULL
                           AND h.released_at IS NULL
                           AND h.expires_at  > now())           AS seats_available

            FROM showtime st
            JOIN film   f  ON f.id  = st.film_id
            JOIN screen sc ON sc.id = st.screen_id
            WHERE st.starts_at > now()
            ORDER BY st.starts_at
            LIMIT :limit
            """;

    private final JdbcClient jdbc;

    ShowtimeQuery(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<ShowtimeSummary> upcoming(int limit) {
        return jdbc.sql(UPCOMING)
                .param("limit", limit)
                .query((rs, rowNum) -> new ShowtimeSummary(
                        rs.getLong("id"),
                        rs.getString("film_title"),
                        rs.getString("screen_name"),
                        rs.getObject("starts_at", OffsetDateTime.class).toInstant(),
                        rs.getInt("runtime_minutes"),
                        rs.getInt("price_minor"),
                        rs.getString("currency"),
                        rs.getInt("seats_available"),
                        rs.getInt("seats_total")))
                .list();
    }
}