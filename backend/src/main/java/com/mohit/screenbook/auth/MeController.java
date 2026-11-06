package com.mohit.screenbook.auth;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * /api/me is the only path the filter chain requires a credential for, so the
 * Jwt here is never null: an unauthenticated request is rejected before it
 * reaches this method.
 *
 * The subject is the user id and nothing else is read from the token. The
 * profile comes from the database, so a changed display name is correct
 * immediately rather than fifteen minutes later when the token expires.
 */
@RestController
@RequestMapping("/api/me")
public class MeController {

    private final AuthService auth;

    MeController(AuthService auth) {
        this.auth = auth;
    }

    @GetMapping
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return auth.me(UUID.fromString(jwt.getSubject()));
    }
}