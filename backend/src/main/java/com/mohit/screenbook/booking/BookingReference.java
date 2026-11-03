package com.mohit.screenbook.booking;

import java.security.SecureRandom;

/**
 * Human-facing codes, meant to be read aloud. No 0, 1, I, L, O or U, so the
 * code survives being dictated down a phone. The booking table has a CHECK
 * constraint on this exact shape, so a generator that drifts from this alphabet
 * fails loudly at the database rather than quietly producing bad references.
 *
 * 30^6 is 729 million, so a collision on the UNIQUE index is not a case worth
 * writing a retry for.
 */
final class BookingReference {

    private static final String ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
    private static final int LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();

    static String generate() {
        StringBuilder code = new StringBuilder("CB-");
        for (int i = 0; i < LENGTH; i++) {
            code.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return code.toString();
    }

    private BookingReference() {
    }
}