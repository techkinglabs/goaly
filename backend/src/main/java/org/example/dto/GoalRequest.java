package org.example.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record GoalRequest(
    @NotBlank(message = "Name is required") String name,
    @NotBlank(message = "Unit is required") String unit,
    @NotNull(message = "Target value is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Target value must be greater than zero")
    BigDecimal targetValue,
    Boolean isActive,
    String description,
    List<String> daysOfWeek,
    String period,
    @DecimalMin(value = "0.0", inclusive = true, message = "Amount per period must not be negative")
    BigDecimal amountPerPeriod,
    LocalDate initialTargetDate,
    @DecimalMin(value = "0.0", inclusive = true, message = "Initial target value must not be negative")
    BigDecimal initialTargetValue
) {}
