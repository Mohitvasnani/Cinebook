package com.mohit.screenbook.common;

import org.springframework.http.HttpStatus;

/**
 * One exception for "no such account" and "wrong password" on purpose. Two
 * distinguishable answers would let anyone confirm which addresses are
 * registered by watching the status codes.
 */
public class InvalidCredentialsException extends ApiException {

    public InvalidCredentialsException() {
        super(HttpStatus.UNAUTHORIZED, Problems.INVALID_CREDENTIALS,
                "Invalid credentials", "That email and password do not match an account.");
    }
}