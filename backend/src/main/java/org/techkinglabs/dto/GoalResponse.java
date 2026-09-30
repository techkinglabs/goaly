package org.techkinglabs.dto;

import java.util.List;

public record GoalResponse(
    Long id,
    String name,
    String unit,
    boolean active,
    String description,
    List<TargetHistoryResponse> targetHistory
) {}
