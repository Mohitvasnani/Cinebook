package com.mohit.screenbook.common;

import org.springframework.http.HttpStatus;

public class NotFoundException extends ApiException {

    public NotFoundException(String detail) {
        super(HttpStatus.NOT_FOUND, Problems.NOT_FOUND, "Not found", detail);
    }
}
