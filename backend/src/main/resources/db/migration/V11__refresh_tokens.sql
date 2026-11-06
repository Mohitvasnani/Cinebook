-- Refresh tokens, so a session can actually be revoked.
--
-- The access token is a short-lived JWT that is never checked against this
-- table: that is the point of it, normal requests stay stateless. The refresh
-- token is the opposite, an opaque random value whose only meaning is that a
-- row exists for it here. Deleting the row ends the session.

CREATE TABLE refresh_token (
    id         uuid        PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES app_user(id),

    -- SHA-256 of the token, hex. NOT BCrypt, deliberately: BCrypt is slow on
    -- purpose because passwords are low-entropy and guessable. A 256-bit
    -- random token is neither, so there is nothing to slow down, and a fast
    -- deterministic hash means the row can be found by lookup instead of by
    -- hashing every candidate row. Hashed rather than stored plainly so that
    -- read access to this table does not hand over live sessions.
    token_hash text        NOT NULL UNIQUE,

    issued_at  timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,

    -- Set when the token is exchanged. The row is kept rather than deleted,
    -- because a second presentation of an already-used token is the signature
    -- of a stolen one: the legitimate client has moved on to its replacement,
    -- so whoever is presenting the old one should not have it. The handler
    -- treats that as a compromise and drops every token for the user.
    used_at    timestamptz,

    CONSTRAINT refresh_expires_after_issue CHECK (expires_at > issued_at)
);

CREATE INDEX refresh_token_by_user ON refresh_token (user_id);

-- Expired and used rows are housekeeping, not correctness: every check already
-- tests expires_at and used_at, so a row left behind can only be rejected,
-- never honoured. Same shape as the hold rows.
CREATE INDEX refresh_token_expiry ON refresh_token (expires_at);