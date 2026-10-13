package org.techkinglabs.dto;

import java.util.Map;

public record ChartDataPoint(
        String label,
        Map<Long, Double> goals,           // daily progress percentage (unchanged)
        Map<Long, Double> totals,          // cumulative progress percentage (unchanged)
        Map<Long, Double> targets,         // effective period target (unchanged)
        Map<Long, Double> idealPaths,      // NEW: ideal path percentage (0→100 linearly)
        Map<Long, Double> cumulativeRaw,   // NEW: cumulative actual value (raw)
        Map<Long, Double> dailyRaw         // NEW: daily actual value (raw)
) {}
