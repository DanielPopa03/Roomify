package com.roomify.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class AccountProviderMismatchException extends RuntimeException {
    public AccountProviderMismatchException(String message) {
        super(message);
    }
}