package com.mohit.screenbook.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * No @Size or @Email here, deliberately. Validating the shape of a submitted
 * credential tells an attacker which guesses were even worth checking, and a
 * password that no longer meets today's rules must still be able to log in.
 */
public record LoginRequest(
        @NotBlank(message = "is required") String email,
        @NotBlank(message = "is required") String password
) {
}