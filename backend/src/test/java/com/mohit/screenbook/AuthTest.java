package com.mohit.screenbook;

import com.mohit.screenbook.auth.AuthService;
import com.mohit.screenbook.auth.LoginRequest;
import com.mohit.screenbook.auth.SignupRequest;
import com.mohit.screenbook.common.EmailTakenException;
import com.mohit.screenbook.common.InvalidCredentialsException;
import com.mohit.screenbook.common.InvalidRefreshTokenException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class AuthTest {

    @Autowired
    AuthService auth;

    /** Unique per test, since these commit and the suite shares a database. */
    private String freshEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }

    private AuthService.Session signUp(String email, String password) {
        return auth.signUp(new SignupRequest(email, password, "Test User"));
    }

    @Test
    @DisplayName("signing up signs you in")
    void signUpIssuesASession() {
        AuthService.Session session = signUp(freshEmail(), "correct horse battery");

        assertNotEquals(null, session.accessToken());
        assertNotEquals(null, session.refreshToken());
    }

    @Test
    @DisplayName("the same email cannot sign up twice")
    void emailIsUnique() {
        String email = freshEmail();
        signUp(email, "correct horse battery");

        assertThrows(EmailTakenException.class, () -> signUp(email, "something else"));
    }

    /**
     * The address is normalised on the way in and on the way out, so the case
     * someone happened to type when signing up cannot lock them out later.
     */
    @Test
    @DisplayName("email case does not matter")
    void emailIsCaseInsensitive() {
        String email = freshEmail();
        signUp(email.toUpperCase(), "correct horse battery");

        AuthService.Session session =
                auth.logIn(new LoginRequest(email.toLowerCase(), "correct horse battery"));

        assertEquals(email.toLowerCase(), session.user().getEmail());
    }

    @Test
    @DisplayName("the wrong password is rejected")
    void wrongPasswordRejected() {
        String email = freshEmail();
        signUp(email, "correct horse battery");

        assertThrows(InvalidCredentialsException.class,
                () -> auth.logIn(new LoginRequest(email, "wrong")));
    }

    /**
     * Same exception as a wrong password, deliberately. If these differed, the
     * status code alone would say which addresses have accounts.
     */
    @Test
    @DisplayName("an unknown email is rejected the same way")
    void unknownEmailRejectedIdentically() {
        assertThrows(InvalidCredentialsException.class,
                () -> auth.logIn(new LoginRequest(freshEmail(), "anything")));
    }

    @Test
    @DisplayName("refreshing rotates the token and kills the old one")
    void refreshRotates() {
        AuthService.Session first = signUp(freshEmail(), "correct horse battery");

        AuthService.Session second = auth.refresh(first.refreshToken());

        assertNotEquals(first.refreshToken(), second.refreshToken(),
                "the refresh token should be replaced, not reused");

        assertThrows(InvalidRefreshTokenException.class,
                () -> auth.refresh(first.refreshToken()),
                "the spent token should no longer work");
    }

    /**
     * The reason rotation is worth having. Presenting a spent token means
     * somebody has a copy they should not, so every session for that user
     * goes, including the one the thief would otherwise still be holding.
     */
    @Test
    @DisplayName("reusing a spent token revokes every session")
    void reuseRevokesEverything() {
        AuthService.Session first = signUp(freshEmail(), "correct horse battery");
        AuthService.Session second = auth.refresh(first.refreshToken());

        assertThrows(InvalidRefreshTokenException.class,
                () -> auth.refresh(first.refreshToken()));

        assertThrows(InvalidRefreshTokenException.class,
                () -> auth.refresh(second.refreshToken()),
                "the live token should have been revoked too");
    }

    @Test
    @DisplayName("logging out ends that session")
    void logOutRevokes() {
        AuthService.Session session = signUp(freshEmail(), "correct horse battery");

        auth.logOut(session.refreshToken());

        assertThrows(InvalidRefreshTokenException.class,
                () -> auth.refresh(session.refreshToken()));
    }

    @Test
    @DisplayName("logging out without a session is not an error")
    void logOutWithoutTokenIsFine() {
        auth.logOut(null);
        auth.logOut("");
    }
}