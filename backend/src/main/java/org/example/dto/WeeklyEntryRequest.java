package org.example.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record WeeklyEntryRequest(
    @NotNull(message = "Goal ID is required") Long goalId,
    @NotNull(message = "Week start date is required") LocalDate weekStartDate,
    @NotNull(message = "Actual value is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Actual value must not be negative")
    BigDecimal actualValue,
    BigDecimal targetValue
) {}
