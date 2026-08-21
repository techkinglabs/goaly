package org.example.exception;

public class DuplicateWeekException extends RuntimeException {
    public DuplicateWeekException(String message) {
        super(message);
    }
}
