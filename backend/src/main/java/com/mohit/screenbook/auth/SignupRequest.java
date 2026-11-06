package com.mohit.screenbook.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * No composition rules on the password, no required symbol or digit. Current
 * NIST guidance is that those push people toward Password1! and away from
 * length, which is the thing that actually matters.
 *
 * The 72 byte ceiling is not arbitrary: BCrypt ignores everything past 72, so
 * a longer password would have a silent dead tail and two passwords sharing a
 * prefix would both unlock the account. Rejecting is honest; truncating is not.
 */
public record SignupRequest(
        @NotBlank(message = "is required")
        @Email(message = "must be a valid email address")
        @Size(max = 254, message = "is too long")
        String email,

        @NotBlank(message = "is required")
        @Size(min = 8, max = 72, message = "must be between 8 and 72 characters")
        String password,

        @NotBlank(message = "is required")
        @Size(max = 80, message = "is too long")
        String displayName
) {
}