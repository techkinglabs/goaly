package org.example.mapper;

import org.example.dto.WeeklyEntryResponse;
import org.example.dto.WeeklyEntryRequest;
import org.example.entity.WeeklyEntry;

public class WeeklyEntryMapper {
    public static WeeklyEntryResponse toResponse(WeeklyEntry entry) {
        if (entry == null) return null;
        return new WeeklyEntryResponse(
            entry.getId(),
            entry.getGoalId(),
            entry.getWeekStartDate(),
            entry.getActualValue(),
            entry.getTargetValue()
        );
    }

    public static WeeklyEntry toEntity(WeeklyEntryRequest request) {
        if (request == null) return null;
        WeeklyEntry entry = new WeeklyEntry();
        entry.setGoalId(request.goalId());
        entry.setWeekStartDate(request.weekStartDate());
        entry.setActualValue(request.actualValue());
        entry.setTargetValue(request.targetValue());
        return entry;
    }

    public static void updateEntityFromRequest(WeeklyEntryRequest request, WeeklyEntry entry) {
        if (request == null || entry == null) return;
        entry.setGoalId(request.goalId());
        entry.setWeekStartDate(request.weekStartDate());
        entry.setActualValue(request.actualValue());
        entry.setTargetValue(request.targetValue());
    }
}
