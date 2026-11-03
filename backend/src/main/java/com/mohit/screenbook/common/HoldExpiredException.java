package com.mohit.screenbook.common;

import org.springframework.http.HttpStatus;

public class HoldExpiredException extends ApiException {

    public HoldExpiredException() {
        super(HttpStatus.CONFLICT, Problems.HOLD_EXPIRED, "Hold expired",
                "That hold expired before it was confirmed. The seat is available again.");
    }
}
