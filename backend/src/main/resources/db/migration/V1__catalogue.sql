-- The things a cinema has before anyone books anything.

CREATE TABLE screen (
    id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text   NOT NULL UNIQUE
);

CREATE TABLE seat (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    screen_id   bigint NOT NULL REFERENCES screen(id),
    row_label   text   NOT NULL,
    seat_number int    NOT NULL,
    -- A screen cannot have two A1s.
    CONSTRAINT seat_unique_in_screen UNIQUE (screen_id, row_label, seat_number)
);

CREATE TABLE film (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title           text   NOT NULL,
    runtime_minutes int    NOT NULL CHECK (runtime_minutes > 0)
);

CREATE TABLE showtime (
    id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    film_id     bigint      NOT NULL REFERENCES film(id),
    screen_id   bigint      NOT NULL REFERENCES screen(id),
    starts_at   timestamptz NOT NULL,
    price_minor int         NOT NULL CHECK (price_minor >= 0),
    currency    text        NOT NULL DEFAULT 'GBP'
                            CHECK (char_length(currency) = 3),
    -- One screening per screen per instant. A screen cannot show two films at once.
    CONSTRAINT showtime_unique_slot UNIQUE (screen_id, starts_at)
);