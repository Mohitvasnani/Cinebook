-- One hold, many seats. One booking, many seats.
--
-- The lifecycle stays on the parent: one expiry, one version, one state. The
-- contract says a hold expires whole and converts whole, so a half-converted
-- hold should not be something this schema can even write down. That is the
-- whole argument for a child table over a group id on the existing rows.
--
-- Order matters here. The seat_availability view reads the columns being
-- dropped, so the view is repointed at the new tables before anything is
-- dropped. Postgres refuses to drop a column a view depends on, so doing it
-- the other way round fails halfway.

-- ---------------------------------------------------------------- hold_seat

-- A composite foreign key needs a unique constraint to point at. (id) alone is
-- already the primary key, so (id, showtime_id) is unique for free, but
-- Postgres still wants it declared before it will accept a reference to it.
ALTER TABLE seat_hold
    ADD CONSTRAINT seat_hold_id_showtime UNIQUE (id, showtime_id);

CREATE TABLE hold_seat (
    hold_id     uuid   NOT NULL,
    seat_id     bigint NOT NULL REFERENCES seat(id),
    -- Copied from the parent so the availability query can filter by showtime
    -- without a join. The composite foreign key below is what stops the copy
    -- from ever disagreeing with the parent: a hold_seat row can only carry
    -- the showtime its own hold has.
    showtime_id bigint NOT NULL,

    PRIMARY KEY (hold_id, seat_id),
    FOREIGN KEY (hold_id, showtime_id)
        REFERENCES seat_hold (id, showtime_id) ON DELETE CASCADE
);

-- Existing holds are one seat each, so every one becomes a single child row.
INSERT INTO hold_seat (hold_id, seat_id, showtime_id)
SELECT id, seat_id, showtime_id FROM seat_hold;

-- The availability query asks "is this seat held for this showtime", which is
-- this index. The primary key leads on hold_id and cannot answer it.
CREATE INDEX hold_seat_by_showtime_seat ON hold_seat (showtime_id, seat_id);

-- ------------------------------------------------------------- booking_seat

ALTER TABLE booking
    ADD CONSTRAINT booking_id_showtime UNIQUE (id, showtime_id);

CREATE TABLE booking_seat (
    booking_id       uuid   NOT NULL,
    seat_id          bigint NOT NULL REFERENCES seat(id),
    showtime_id      bigint NOT NULL,
    -- What this seat actually cost, recorded rather than referenced, so a
    -- later price change does not rewrite history. No stored total: the total
    -- is SUM(price_paid_minor), which cannot disagree with its own lines.
    price_paid_minor int    NOT NULL CHECK (price_paid_minor >= 0),

    PRIMARY KEY (booking_id, seat_id),
    FOREIGN KEY (booking_id, showtime_id)
        REFERENCES booking (id, showtime_id),

    -- THE invariant, moved down from booking. Two people cannot both own the
    -- same seat at the same screening, and this one line is what guarantees
    -- it. Everything above is an optimisation on top of it.
    CONSTRAINT booking_seat_one_per_showtime UNIQUE (showtime_id, seat_id)
);

INSERT INTO booking_seat (booking_id, seat_id, showtime_id, price_paid_minor)
SELECT id, seat_id, showtime_id, price_paid_minor FROM booking;

-- --------------------------------------------------- repoint the view first

-- Same four leading columns in the same order, so CREATE OR REPLACE is legal.
-- BOOKED no longer needs a join: booking_seat carries showtime_id itself.
-- HELD does need one, because whether a hold is live is a fact about the
-- parent, not the seat.
CREATE OR REPLACE VIEW seat_availability AS
SELECT st.id         AS showtime_id,
       s.id          AS seat_id,
       s.row_label   AS row_label,
       s.seat_number AS seat_number,
       CASE
         WHEN EXISTS (SELECT 1
                      FROM booking_seat bs
                      WHERE bs.showtime_id = st.id
                        AND bs.seat_id     = s.id)
           THEN 'BOOKED'
         WHEN EXISTS (SELECT 1
                      FROM hold_seat hs
                      JOIN seat_hold h ON h.id = hs.hold_id
                      WHERE hs.showtime_id = st.id
                        AND hs.seat_id     = s.id
                        AND h.booked_at    IS NULL
                        AND h.released_at  IS NULL
                        AND h.expires_at   > now())
           THEN 'HELD'
         ELSE 'AVAILABLE'
       END           AS status,
       s.tier                               AS tier,
       t.display_name                       AS tier_name,
       st.price_minor + t.price_delta_minor AS price_minor,
       st.currency                          AS currency
FROM showtime st
JOIN seat      s ON s.screen_id = st.screen_id
JOIN seat_tier t ON t.code      = s.tier;

-- ------------------------------------------------- now the old shape can go

-- Indexed (showtime_id, seat_id) on a table that no longer has seat_id.
DROP INDEX seat_hold_live;

ALTER TABLE seat_hold DROP COLUMN seat_id;

ALTER TABLE booking DROP CONSTRAINT booking_one_per_seat_per_showtime;
ALTER TABLE booking DROP COLUMN seat_id;
ALTER TABLE booking DROP COLUMN price_paid_minor;