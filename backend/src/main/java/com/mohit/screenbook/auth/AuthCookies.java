package com.mohit.screenbook.auth;

import org.springframework.boot.web.server.Cookie.SameSite;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

/**
 * Cookie shapes in one place, because the attributes are the security
 * boundary and three slightly different copies of them is how one ends up
 * missing Secure.
 */
public final class AuthCookies {

    public static final String ACCESS = "sb_access";
    public static final String REFRESH = "sb_refresh";

    private AuthCookies() {
    }

    /**
     * httpOnly so an XSS bug cannot read the session. SameSite=Lax so the
     * browser will not attach it to a cross-site POST, which is most of CSRF
     * defence before a token is involved at all.
     *
     * Path is /api, not /: the cookie has no business being sent with page
     * requests to Next.js.
     */
    public static ResponseCookie access(String token, Duration ttl, boolean secure) {
        return base(ACCESS, token, ttl, secure).path("/api").build();
    }

    /**
     * Scoped to the one endpoint that consumes it. A refresh token sent with
     * every seat map request is a refresh token exposed to every bug in every
     * other handler; this one is only ever on the wire when it is being
     * exchanged.
     */
    public static ResponseCookie refresh(String token, Duration ttl, boolean secure) {
        return base(REFRESH, token, ttl, secure).path("/api/auth").build();
    }

    /** Same attributes, no value, zero age. Anything else leaves it in place. */
    public static ResponseCookie clearAccess(boolean secure) {
        return access("", Duration.ZERO, secure);
    }

    public static ResponseCookie clearRefresh(boolean secure) {
        return refresh("", Duration.ZERO, secure);
    }

    private static ResponseCookie.ResponseCookieBuilder base(
            String name, String value, Duration ttl, boolean secure) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                /* False only on http://localhost, where a Secure cookie would
                   simply never be set and login would fail locally with no
                   error worth reading. */
                .secure(secure)
                .sameSite(SameSite.LAX.attributeValue())
                .maxAge(ttl);
    }
}