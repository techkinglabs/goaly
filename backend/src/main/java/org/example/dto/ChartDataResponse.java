package org.example.dto;

import java.util.Map;

public record ChartDataResponse(
    String weekStart,
    Map<String, Double> goals,
    Map<String, Double> totals

) {}
