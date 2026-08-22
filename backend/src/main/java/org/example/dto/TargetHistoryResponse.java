package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TargetHistoryResponse(
    Long id,
    Long goalId,
    LocalDate validFrom,
    LocalDate validTo,
    BigDecimal value,
    String period
) {}
