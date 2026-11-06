package com.mohit.screenbook.auth;

import java.time.Instant;
import java.util.UUID;

public record MeResponse(UUID id, String email, String displayName, Instant createdAt) {
}