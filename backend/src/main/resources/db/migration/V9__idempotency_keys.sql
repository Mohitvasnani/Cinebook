-- Idempotency for POST /api/bookings.
--
-- The row is written BEFORE the booking is attempted, which is what makes the
-- primary key useful: two concurrent requests with one key cannot both get past
-- the insert, so exactly one does the work and the other is told to read the
-- result or come back.

CREATE TABLE idempotency_key (
    key               text        PRIMARY KEY,

    -- SHA-256 of the request, hex. Enough to spot a client reusing a key for a
    -- different request, without keeping a second copy of the request.
    request_hash      text        NOT NULL,

    -- The booking this key produced, or NULL while the attempt is still in
    -- flight. The response is not stored: a booking never changes, so reading
    -- it back by reference reproduces the original response exactly.
    booking_reference text        REFERENCES booking(reference),

    created_at        timestamptz NOT NULL DEFAULT now()
);

-- Keys are kept 24 hours, which covers any realistic retry. This index is what
-- would make that delete cheap; the delete is housekeeping rather than
-- correctness, so there is no job for it yet.
CREATE INDEX idempotency_key_created_at ON idempotency_key (created_at);