package com.mohit.screenbook.common;

import org.springframework.http.HttpStatus;

public class HoldAlreadyConvertedException extends ApiException {

    public HoldAlreadyConvertedException(String detail) {
        super(HttpStatus.CONFLICT, Problems.HOLD_ALREADY_CONVERTED,
                "Hold already converted", detail);
    }
}
