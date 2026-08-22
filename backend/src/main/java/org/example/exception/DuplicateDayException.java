package org.example.exception;

public class DuplicateDayException extends RuntimeException {
    public DuplicateDayException(String message) {
        super(message);
    }
}
