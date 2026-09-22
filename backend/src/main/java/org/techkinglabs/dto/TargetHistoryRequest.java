package org.techkinglabs.dto;

import jakarta.validation.constraints.NotNull;
import org.techkinglabs.model.Period;
import java.math.BigDecimal;
import java.time.LocalDate;

public record TargetHistoryRequest(
    @NotNull LocalDate validFrom,
    LocalDate validTo,
    @NotNull BigDecimal value,
    @NotNull Period period
) {}