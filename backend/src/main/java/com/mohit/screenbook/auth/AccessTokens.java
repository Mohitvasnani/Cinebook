package com.mohit.screenbook.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Mints the short-lived access token.
 *
 * The only claim beyond the standard ones is the subject, the user id. No
 * email, no display name: a token is a credential, not a cache. Anything
 * copied into it is a signed snapshot that cannot be corrected until it
 * expires, so a renamed user would keep seeing their old name for fifteen
 * minutes. /api/me reads the database instead, which is one indexed lookup.
 */
@Service
public class AccessTokens {

    private final JwtEncoder encoder;
    private final Clock clock;
    private final Duration ttl;

    AccessTokens(JwtEncoder encoder, Clock clock,
                 @Value("${screenbook.jwt.access-ttl-minutes}") long ttlMinutes) {
        this.encoder = encoder;
        this.clock = clock;
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }

    public String mint(AppUser user) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("screenbook")
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .subject(user.getId().toString())
                .build();

        /* The header is not optional here. NimbusJwtEncoder defaults to RS256
           when none is given, then goes looking for an RSA key and finds a
           symmetric secret, which fails as "could not select a JWK signing
           key". Saying HS256 explicitly is also what makes the decoder's
           matching macAlgorithm setting a pair rather than a coincidence. */
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public Duration ttl() {
        return ttl;
    }
}