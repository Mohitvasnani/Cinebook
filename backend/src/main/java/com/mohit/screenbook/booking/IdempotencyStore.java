package com.mohit.screenbook.booking;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * The idempotency table, in plain SQL.
 *
 * Every method runs in its own transaction, REQUIRES_NEW rather than the
 * default. The claim has to be committed and visible to a concurrent request
 * BEFORE the booking runs, so it cannot share the booking's transaction. A
 * plain @Transactional would do that today, because the caller is not
 * transactional, but it would break silently the day somebody made it so.
 */
@Repository
public class IdempotencyStore {

    /**
     * ON CONFLICT DO NOTHING rather than catching a duplicate key exception.
     * A constraint violation poisons the transaction, so the alternative is an
     * aborted transaction to recover from; this just reports zero rows written.
     */
    private static final String CLAIM = """
            INSERT INTO idempotency_key (key, request_hash)
            VALUES (:key, :hash)
            ON CONFLICT (key) DO NOTHING
            """;

    private static final String FIND = """
            SELECT request_hash, booking_reference
            FROM idempotency_key
            WHERE key = :key
            """;

    private static final String COMPLETE = """
            UPDATE idempotency_key
               SET booking_reference = :reference
             WHERE key = :key
            """;

    private static final String RELEASE = "DELETE FROM idempotency_key WHERE key = :key";

    private final JdbcClient jdbc;

    IdempotencyStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** A claimed key with no booking yet is an attempt still in flight. */
    public record Claim(String requestHash, String bookingReference) {
        public boolean finished() {
            return bookingReference != null;
        }
    }

    /** True if this request claimed the key, false if someone already had it. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claim(String key, String requestHash) {
        return jdbc.sql(CLAIM)
                .param("key", key)
                .param("hash", requestHash)
                .update() == 1;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Optional<Claim> find(String key) {
        return jdbc.sql(FIND)
                .param("key", key)
                .query((rs, rowNum) -> new Claim(
                        rs.getString("request_hash"),
                        rs.getString("booking_reference")))
                .optional();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void complete(String key, String bookingReference) {
        jdbc.sql(COMPLETE)
                .param("key", key)
                .param("reference", bookingReference)
                .update();
    }

    /**
     * Hands the key back after a failed attempt, so a genuine retry is not
     * blocked forever by a booking that was never created.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void release(String key) {
        jdbc.sql(RELEASE).param("key", key).update();
    }
}