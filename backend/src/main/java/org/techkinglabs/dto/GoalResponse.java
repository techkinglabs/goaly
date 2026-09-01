package org.techkinglabs.dto;

import org.techkinglabs.model.Period;
import java.math.BigDecimal;
import java.util.List;

public record GoalResponse(
    Long id,
    String name,
    String unit,
    BigDecimal targetValue,
    Boolean isActive,
    String description,
    Period period,
    BigDecimal amountPerPeriod,
    List<TargetHistoryResponse> targetHistory
) {}
