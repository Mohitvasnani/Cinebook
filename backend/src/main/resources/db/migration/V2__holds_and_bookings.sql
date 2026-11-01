-- The booking machinery. This is where the state machine lives.

CREATE TABLE seat_hold (
    id          uuid        PRIMARY KEY,
    showtime_id bigint      NOT NULL REFERENCES showtime(id),
    seat_id     bigint      NOT NULL REFERENCES seat(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL,
    booked_at   timestamptz,
    released_at timestamptz,
    -- Backs JPA's @Version for the hold-to-booking conversion.
    version     bigint      NOT NULL DEFAULT 0,

    CONSTRAINT hold_expires_after_creation
        CHECK (expires_at > created_at),
    -- A hold ends one way or the other, never both.
    CONSTRAINT hold_not_booked_and_released
        CHECK (booked_at IS NULL OR released_at IS NULL)
);

-- Narrows lookups to holds that could still matter. An expired hold is still
-- in here, so the status query adds expires_at > now() on top.
CREATE INDEX seat_hold_live
    ON seat_hold (showtime_id, seat_id)
    WHERE booked_at IS NULL AND released_at IS NULL;

CREATE TABLE booking (
    id               uuid        PRIMARY KEY,
    reference        text        NOT NULL UNIQUE,
    hold_id          uuid        NOT NULL UNIQUE REFERENCES seat_hold(id),
    showtime_id      bigint      NOT NULL REFERENCES showtime(id),
    seat_id          bigint      NOT NULL REFERENCES seat(id),
    price_paid_minor int         NOT NULL CHECK (price_paid_minor >= 0),
    currency         text        NOT NULL CHECK (char_length(currency) = 3),
    booked_at        timestamptz NOT NULL DEFAULT now(),

    -- The invariant. Everything else is an optimisation on top of this line.
    CONSTRAINT booking_one_per_seat_per_showtime UNIQUE (showtime_id, seat_id),
    CONSTRAINT booking_reference_shape
        CHECK (reference ~ '^CB-[2-9A-HJKMNP-TV-Z]{6}$')
);