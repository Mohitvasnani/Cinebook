package com.mohit.screenbook.auth;

import com.mohit.screenbook.common.InvalidRefreshTokenException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

/**
 * The server side of a session. The access token is stateless; this table is
 * the only thing that makes logging out mean anything.
 */
@Repository
public class RefreshTokens {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokens.class);

    private static final SecureRandom RANDOM = new SecureRandom();
    /* 256 bits. Unguessable by brute force, which is why the stored hash can
       be a fast one: there is no dictionary to run against it. */
    private static final int TOKEN_BYTES = 32;

    private static final String INSERT = """
            INSERT INTO refresh_token (id, user_id, token_hash, expires_at)
            VALUES (:id, :userId, :hash, :expiresAt)
            """;

    private static final String FIND = """
            SELECT id, user_id, expires_at, used_at
            FROM refresh_token
            WHERE token_hash = :hash
            """;

    /* The AND used_at IS NULL is the whole concurrency control: two requests
       presenting the same token both see NULL on read, and exactly one of them
       updates a row. The loser gets zero and is treated as a reuse. */
    private static final String MARK_USED = """
            UPDATE refresh_token SET used_at = :now
            WHERE id = :id AND used_at IS NULL
            """;

    private static final String DELETE_FOR_USER =
            "DELETE FROM refresh_token WHERE user_id = :userId";

    private static final String DELETE_ONE =
            "DELETE FROM refresh_token WHERE token_hash = :hash";

    private final JdbcClient jdbc;
    private final Clock clock;
    private final Duration ttl;
    private final TransactionTemplate inOwnTransaction;

    RefreshTokens(JdbcClient jdbc, Clock clock, PlatformTransactionManager transactions,
                  @Value("${screenbook.jwt.refresh-ttl-days}") long ttlDays) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.ttl = Duration.ofDays(ttlDays);
        this.inOwnTransaction = new TransactionTemplate(transactions);
        this.inOwnTransaction.setPropagationBehavior(
                TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** The new token, exactly once. Only its hash is kept. */
    @Transactional
    public String issue(UUID userId) {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        jdbc.sql(INSERT)
                .param("id", UUID.randomUUID())
                .param("userId", userId)
                .param("hash", sha256(raw))
                /* OffsetDateTime, not Instant: the driver will not infer a SQL
                   type for an Instant, because an Instant carries no zone and
                   it declines to guess. UTC because that is what timestamptz
                   stores regardless. */
                .param("expiresAt", clock.instant().plus(ttl).atOffset(ZoneOffset.UTC))
                .update();

        return raw;
    }

    public record Rotation(UUID userId, String nextToken) {
    }

    /**
     * Exchanges a refresh token for its replacement.
     *
     * Every rejection is the same InvalidRefreshTokenException, whether the
     * token never existed, expired, or was already used. The client cannot
     * tell the cases apart, which matters for the reuse case: an attacker
     * should not learn that they were detected. The server log says so
     * instead.
     */
    @Transactional
    public Rotation rotate(String rawToken) {
        String hash = sha256(rawToken);

        Stored stored = jdbc.sql(FIND)
                .param("hash", hash)
                .query((rs, rowNum) -> new Stored(
                        rs.getObject("id", UUID.class),
                        rs.getObject("user_id", UUID.class),
                        rs.getObject("expires_at", OffsetDateTime.class).toInstant(),
                        rs.getObject("used_at", OffsetDateTime.class) == null
                                ? null
                                : rs.getObject("used_at", OffsetDateTime.class).toInstant()))
                .optional()
                .orElseThrow(InvalidRefreshTokenException::new);

        Instant now = clock.instant();

        /* Already exchanged. The real client has its replacement, so whoever
           is presenting this one should not have it. Drop every session the
           user has rather than guess which is the attacker. */
        if (stored.usedAt() != null) {
            log.warn("Refresh token reuse detected for user {}; revoking all sessions",
                    stored.userId());
            revokeAll(stored.userId());
            throw new InvalidRefreshTokenException();
        }

        if (!stored.expiresAt().isAfter(now)) {
            throw new InvalidRefreshTokenException();
        }

        int marked = jdbc.sql(MARK_USED)
                .param("id", stored.id())
                .param("now", now.atOffset(ZoneOffset.UTC))
                .update();

        /* Lost the race with a concurrent exchange of the same token. Treated
           as reuse, which is strictly correct and is also why the client keeps
           a single shared refresh in flight rather than one per tab. */
        if (marked == 0) {
            log.warn("Concurrent refresh of one token for user {}; revoking all sessions",
                    stored.userId());
            revokeAll(stored.userId());
            throw new InvalidRefreshTokenException();
        }

        return new Rotation(stored.userId(), issue(stored.userId()));
    }

    /** Logout. Deleting rather than marking used: there is no replacement. */
    @Transactional
    public void revoke(String rawToken) {
        jdbc.sql(DELETE_ONE).param("hash", sha256(rawToken)).update();
    }

    /**
     * Revocation commits independently of whatever called it.
     *
     * The reuse path deletes every session and then throws, and the throw
     * rolls back the surrounding transaction. In one transaction the delete
     * would go with it: the compromise would be detected, reported, and then
     * quietly undone. A separate transaction is what makes the response to an
     * attack outlive the rejection of it.
     *
     * A TransactionTemplate rather than @Transactional(REQUIRES_NEW) because
     * rotate() calls this from inside the same class, and a self-invocation
     * never passes through the proxy that would apply the annotation.
     */
    public void revokeAll(UUID userId) {
        inOwnTransaction.executeWithoutResult(status ->
                jdbc.sql(DELETE_FOR_USER).param("userId", userId).update());
    }

    private record Stored(UUID id, UUID userId, Instant expiresAt, Instant usedAt) {
    }

    /**
     * SHA-256, not BCrypt. BCrypt is slow by design because passwords are
     * low-entropy and worth brute-forcing; a 256-bit random value is neither,
     * so slowness buys nothing and costs a table scan, since the row has to be
     * found by hash rather than by trying every candidate.
     */
    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}