package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WeeklyEntryResponse(
    Long id,
    Long goalId,
    LocalDate weekStartDate,
    BigDecimal actualValue,
    BigDecimal targetValue
) {}
