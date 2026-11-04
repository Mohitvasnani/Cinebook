-- Adds tier, tier name and resolved price to the seat map's one source of truth.
-- CREATE OR REPLACE VIEW can only append columns, never reorder or retype the
-- existing ones, which is why the original four are repeated verbatim.

CREATE OR REPLACE VIEW seat_availability AS
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
       END           AS status,
       s.tier                                  AS tier,
       t.display_name                          AS tier_name,
       st.price_minor + t.price_delta_minor    AS price_minor,
       st.currency                             AS currency
FROM showtime st
JOIN seat      s ON s.screen_id = st.screen_id
JOIN seat_tier t ON t.code      = s.tier;