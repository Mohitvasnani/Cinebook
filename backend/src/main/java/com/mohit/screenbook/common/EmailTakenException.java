package com.mohit.screenbook.common;

import org.springframework.http.HttpStatus;

/** 409 rather than 422: the request is well formed, the world disagrees with it. */
public class EmailTakenException extends ApiException {

    public EmailTakenException() {
        super(HttpStatus.CONFLICT, Problems.EMAIL_TAKEN,
                "Email already registered", "An account already exists for that email address.");
    }
}