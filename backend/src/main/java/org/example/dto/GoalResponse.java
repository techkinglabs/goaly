package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GoalResponse(
    Long id,
    String name,
    String unit,
    BigDecimal targetValue,
    Boolean isActive,
    String description,
    java.util.List<String> daysOfWeek
) {}
