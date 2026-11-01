-- One definition of "what is this seat's status for this showtime", shared by
-- the seat map and by the claim path. Written twice in Java it would be two
-- places to get wrong.
--
-- The view is every showtime crossed with the seats in its screen. Postgres
-- inlines a view into the calling query rather than storing it, so
-- WHERE showtime_id = 1 AND seat_id = 1002 narrows to one row before any of
-- the EXISTS subqueries run.

CREATE VIEW seat_availability AS
SELECT st.id         AS showtime_id,
       s.id          AS seat_id,
       s.row_label   AS row_label,
       s.seat_number AS seat_number,
       CASE
         WHEN EXISTS (SELECT 1
                      FROM booking b
                      WHERE b.showtime_id = st.id
                        AND b.seat_id     = s.id)
           THEN 'BOOKED'
         WHEN EXISTS (SELECT 1
                      FROM seat_hold h
                      WHERE h.showtime_id = st.id
                        AND h.seat_id     = s.id
                        AND h.booked_at   IS NULL
                        AND h.released_at IS NULL
                        AND h.expires_at  > now())
           THEN 'HELD'
         ELSE 'AVAILABLE'
       END           AS status
FROM showtime st
JOIN seat s ON s.screen_id = st.screen_id;