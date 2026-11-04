package com.mohit.screenbook.booking;

import com.mohit.screenbook.common.IdempotencyKeyInProgressException;
import com.mohit.screenbook.common.IdempotencyKeyReusedException;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Makes POST /api/bookings safe to retry.
 *
 * Deliberately NOT @Transactional. The claim must commit before the booking
 * starts, which cannot happen if both are in one transaction.
 *
 * The header is optional: a request without one behaves exactly as before, so
 * poking at the API by hand or through Swagger still works. The frontend always
 * sends one.
 */
@Service
public class IdempotentBookings {

    private final BookingService bookings;
    private final IdempotencyStore keys;

    IdempotentBookings(BookingService bookings, IdempotencyStore keys) {
        this.bookings = bookings;
        this.keys = keys;
    }

    public BookingResponse confirm(UUID holdId, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return bookings.confirm(holdId);
        }

        String hash = sha256(holdId.toString());

        /* Claim first. Losing this race means another request already owns the
           key, and the only question is what it did with it. */
        if (!keys.claim(idempotencyKey, hash)) {
            IdempotencyStore.Claim existing = keys.find(idempotencyKey)
                    /* Gone between the failed insert and this read, so the other
                       attempt failed and released it. Telling the client to
                       retry is correct and is also what it would do anyway. */
                    .orElseThrow(IdempotencyKeyInProgressException::new);

            if (!existing.requestHash().equals(hash)) {
                throw new IdempotencyKeyReusedException();
            }
            if (!existing.finished()) {
                throw new IdempotencyKeyInProgressException();
            }

            /* Re-read rather than replay a stored body. A booking never
               changes, so this reproduces the original response exactly. */
            return bookings.find(existing.bookingReference());
        }

        try {
            BookingResponse booking = bookings.confirm(holdId);
            keys.complete(idempotencyKey, booking.bookingReference());
            return booking;
        } catch (RuntimeException e) {
            /* An expired hold or a double submit is a real failure, and the key
               should not be left claiming a booking that does not exist. */
            keys.release(idempotencyKey);
            throw e;
        }
    }

    /**
     * Hashes the request's one meaningful field rather than the raw bytes,
     * which Spring has already consumed by the time this runs. If the body ever
     * grows past one field, this has to hash a canonical serialisation instead,
     * or two equivalent requests with different key order would disagree.
     */
    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            /* SHA-256 is required of every JVM, so this is unreachable. */
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
    public BookingResponse find(String reference) {
        return bookings.find(reference);
    }
}