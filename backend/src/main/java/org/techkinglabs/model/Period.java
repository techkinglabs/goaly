package org.techkinglabs.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Period {
    DAY("DAY"),
    WEEK("WEEK"),
    WORKWEEK("WORKWEEK"),
    WEEKEND("WEEKEND"),
    MONTH("MONTH"),
    YEAR("YEAR");

    private final String value;

    Period(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static Period fromValue(String raw) {
        if (raw == null) return WEEK;
        return switch (raw.toUpperCase()) {
            case "DAY", "DAILY", "D" -> DAY;
            case "WEEK" -> WEEK;
            case "MONTH", "MONTHLY", "M" -> MONTH;
            case "YEAR", "YEARLY", "ANNUAL", "Y" -> YEAR;
            case "WORKWEEK", "WORK_WEEK", "WW" -> WORKWEEK;
            case "WEEKEND", "WE" -> WEEKEND;
            default -> throw new IllegalArgumentException("Unknown period: " + raw);
        };
    }
}
