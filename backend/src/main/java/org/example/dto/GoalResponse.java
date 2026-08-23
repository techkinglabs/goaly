package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record GoalResponse(
    Long id,
    String name,
    String unit,
    BigDecimal targetValue,
    Boolean isActive,
    String description,
    String period,
    BigDecimal amountPerPeriod,
    List<TargetHistoryResponse> targetHistory
) {}
