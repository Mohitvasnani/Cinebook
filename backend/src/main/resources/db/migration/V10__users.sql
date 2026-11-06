-- Accounts, and the link from a booking to one.
--
-- app_user, not user: "user" is reserved in Postgres, where SELECT user
-- returns the current database role, so a table of that name needs quoting in
-- every statement that touches it forever.

CREATE TABLE app_user (
    id            uuid        PRIMARY KEY,

    -- Stored lowercase so uniqueness is case-insensitive without the citext
    -- extension. The CHECK makes that a guarantee rather than a convention:
    -- any code path that forgets to normalise fails here instead of quietly
    -- creating a second account for the same person.
    email         text        NOT NULL UNIQUE CHECK (email = lower(email)),

    -- BCrypt output, 60 characters including its own salt and cost. Never the
    -- password, and never anything reversible.
    password_hash text        NOT NULL,

    display_name  text        NOT NULL CHECK (length(trim(display_name)) > 0),

    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Guest checkout stays, so both of these are nullable.
--
-- user_id is set when someone books while signed in. email is captured at
-- checkout whether or not they are, which is what lets a guest get their
-- confirmation, and what lets their old bookings surface if they sign up with
-- the same address later.
ALTER TABLE booking ADD COLUMN user_id uuid REFERENCES app_user(id);
ALTER TABLE booking ADD COLUMN email   text CHECK (email IS NULL OR email = lower(email));

-- "My bookings", newest first. Partial, because most rows are guest bookings
-- with no user_id and indexing those wastes space on rows the query skips.
CREATE INDEX booking_by_user ON booking (user_id, booked_at DESC)
    WHERE user_id IS NOT NULL;

-- Claiming guest bookings by address later.
CREATE INDEX booking_by_email ON booking (email) WHERE email IS NOT NULL;