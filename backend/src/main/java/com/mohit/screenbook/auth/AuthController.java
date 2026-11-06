package com.mohit.screenbook.auth;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * Sessions live in cookies, never in the response body. A token the page can
 * read is a token an XSS bug can read, so nothing here returns one: the body
 * carries who you are, the headers carry the credential.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final AccessTokens accessTokens;
    private final boolean secureCookies;
    private final Duration refreshTtl;

    AuthController(AuthService auth, AccessTokens accessTokens,
                   @Value("${screenbook.cookies.secure}") boolean secureCookies,
                   @Value("${screenbook.jwt.refresh-ttl-days}") long refreshTtlDays) {
        this.auth = auth;
        this.accessTokens = accessTokens;
        this.secureCookies = secureCookies;
        this.refreshTtl = Duration.ofDays(refreshTtlDays);
    }

    @PostMapping("/signup")
    public ResponseEntity<MeResponse> signUp(@Valid @RequestBody SignupRequest request) {
        return withSession(HttpStatus.CREATED, auth.signUp(request));
    }

    @PostMapping("/login")
    public ResponseEntity<MeResponse> logIn(@Valid @RequestBody LoginRequest request) {
        return withSession(HttpStatus.OK, auth.logIn(request));
    }

    /**
     * Returns the user as well as new cookies, so a client that has just
     * started up can establish who it is in one request rather than refreshing
     * and then asking.
     */
    @PostMapping("/refresh")
    public ResponseEntity<MeResponse> refresh(
            @CookieValue(name = AuthCookies.REFRESH, required = false) String refreshToken) {

        if (refreshToken == null || refreshToken.isBlank()) {
            /* No cookie at all is the same answer as a bad one. Anything else
               would tell a caller whether a session had ever existed. */
            throw new com.mohit.screenbook.common.InvalidRefreshTokenException();
        }
        return withSession(HttpStatus.OK, auth.refresh(refreshToken));
    }

    /**
     * 204 whether or not there was a session. Logging out when you are not
     * logged in is not an error, the same way releasing a lapsed hold is not.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logOut(
            @CookieValue(name = AuthCookies.REFRESH, required = false) String refreshToken) {

        auth.logOut(refreshToken);

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE,
                        AuthCookies.clearAccess(secureCookies).toString())
                .header(HttpHeaders.SET_COOKIE,
                        AuthCookies.clearRefresh(secureCookies).toString())
                .build();
    }

    private ResponseEntity<MeResponse> withSession(HttpStatus status, AuthService.Session session) {
        AppUser user = session.user();
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE,
                        AuthCookies.access(session.accessToken(), accessTokens.ttl(), secureCookies)
                                .toString())
                .header(HttpHeaders.SET_COOKIE,
                        AuthCookies.refresh(session.refreshToken(), refreshTtl, secureCookies)
                                .toString())
                .body(new MeResponse(
                        user.getId(), user.getEmail(), user.getDisplayName(), user.getCreatedAt()));
    }
}