package com.mohit.cinebook.common;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Base for every failure the API reports deliberately. Carries everything the
 * RFC 9457 body needs, so the handler is a translation step with no decisions
 * of its own.
 */
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String type;
    private final String title;
    private final Map<String, Object> extras;

    protected ApiException(HttpStatus status, String type, String title, String detail,
                           Map<String, Object> extras) {
        super(detail);
        this.status = status;
        this.type = type;
        this.title = title;
        this.extras = extras == null ? Map.of() : Map.copyOf(extras);
    }

    protected ApiException(HttpStatus status, String type, String title, String detail) {
        this(status, type, title, detail, Map.of());
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    /** Extra members on the problem body, such as seatId on seat-unavailable. */
    public Map<String, Object> getExtras() {
        return extras;
    }
}
