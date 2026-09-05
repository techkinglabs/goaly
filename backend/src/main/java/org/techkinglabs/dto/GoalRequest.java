package org.techkinglabs.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.techkinglabs.model.Period;
import java.math.BigDecimal;

public record GoalRequest(
    @NotBlank(message = "Name is required") String name,
    @NotBlank(message = "Unit is required") String unit,
    @NotNull(message = "Target value is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Target value must be greater than zero")
    BigDecimal targetValue,
    Boolean isActive,
    String description,
    Period period,
    @DecimalMin(value = "0.0", message = "Amount per period must not be negative")
    BigDecimal amountPerPeriod
) {}
