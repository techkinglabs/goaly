package org.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record WeeklyEntryRequest(
    @NotNull(message = "Goal ID is required") Long goalId,
    @NotNull(message = "Week start date is required") LocalDate weekStartDate,
    @NotNull(message = "Actual value is required") BigDecimal actualValue,
    @NotNull(message = "Target value is required") BigDecimal targetValue
) {}
