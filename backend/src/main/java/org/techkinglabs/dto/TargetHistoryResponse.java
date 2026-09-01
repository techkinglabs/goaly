package org.techkinglabs.dto;

import org.techkinglabs.model.Period;
import java.math.BigDecimal;
import java.time.LocalDate;

public record TargetHistoryResponse(
    Long id,
    Long goalId,
    LocalDate validFrom,
    LocalDate validTo,
    BigDecimal value,
    Period period
) {}
