package com.mohit.screenbook.common;

import org.springframework.http.HttpStatus;

/** One answer for every refresh failure, so no case can be told from another. */
public class InvalidRefreshTokenException extends ApiException {

    public InvalidRefreshTokenException() {
        super(HttpStatus.UNAUTHORIZED, Problems.INVALID_REFRESH_TOKEN,
                "Session expired", "Sign in again.");
    }
}