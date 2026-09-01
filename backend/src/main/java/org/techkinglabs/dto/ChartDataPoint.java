package org.techkinglabs.dto;

import java.util.Map;

public record ChartDataPoint(
    String label,
    Map<Long, Double> goals,
    Map<Long, Double> totals,
    Map<Long, Double> targets
) {}
