package org.techkinglabs.dto;

import jakarta.validation.constraints.NotBlank;
import org.techkinglabs.model.Period;
import java.math.BigDecimal;

public record GoalRequest(
    @NotBlank(message = "Name is required") String name,
    @NotBlank(message = "Unit is required") String unit,
    Boolean active,
    String description,
    BigDecimal initialTargetValue,
    Period initialPeriod
) {}
