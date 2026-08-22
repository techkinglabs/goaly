package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyEntryResponse(
    Long id,
    Long goalId,
    LocalDate entryDate,
    BigDecimal actualValue,
    BigDecimal targetValue
) {}
