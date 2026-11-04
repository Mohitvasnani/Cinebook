package com.mohit.screenbook.common;

import org.springframework.http.HttpStatus;

/**
 * A retry that arrived while the first attempt is still running. There is no
 * honest answer yet: the booking may or may not exist in a moment, so the
 * client is told to ask again rather than given a guess.
 */
public class IdempotencyKeyInProgressException extends ApiException {

    public IdempotencyKeyInProgressException() {
        super(HttpStatus.CONFLICT, Problems.IDEMPOTENCY_KEY_IN_PROGRESS,
                "Request in progress",
                "A request with that Idempotency-Key is still being processed. Retry in a moment.");
    }
}