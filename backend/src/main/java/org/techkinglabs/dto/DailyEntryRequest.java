package org.techkinglabs.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyEntryRequest(
    @NotNull(message = "Goal ID is required") Long goalId,
    @NotNull(message = "Entry date is required") LocalDate entryDate,
    @NotNull(message = "Actual value is required")
    @DecimalMin(value = "0.0", message = "Actual value must not be negative")
    BigDecimal actualValue,
    String note
) {}
