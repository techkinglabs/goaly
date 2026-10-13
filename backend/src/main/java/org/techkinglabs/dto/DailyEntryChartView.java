package org.techkinglabs.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyEntryChartView(
        LocalDate entryDate,
        BigDecimal actualValue
) {}