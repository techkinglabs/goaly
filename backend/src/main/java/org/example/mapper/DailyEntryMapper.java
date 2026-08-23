package org.example.mapper;

import org.example.dto.DailyEntryResponse;
import org.example.dto.DailyEntryRequest;
import org.example.entity.DailyEntry;

public class DailyEntryMapper {
    public static DailyEntryResponse toResponse(DailyEntry entry) {
        if (entry == null) return null;
        return new DailyEntryResponse(
            entry.getId(),
            entry.getGoalId(),
            entry.getEntryDate(),
            entry.getActualValue(),
            entry.getTargetValue(),
            entry.getNote()
        );
    }

    public static DailyEntry toEntity(DailyEntryRequest request) {
        if (request == null) return null;
        DailyEntry entry = new DailyEntry();
        entry.setGoalId(request.goalId());
        entry.setEntryDate(request.entryDate());
        entry.setActualValue(request.actualValue());
        entry.setTargetValue(request.targetValue());
        entry.setNote(request.note());
        return entry;
    }

    public static void updateEntityFromRequest(DailyEntryRequest request, DailyEntry entry) {
        if (request == null || entry == null) return;
        entry.setGoalId(request.goalId());
        entry.setEntryDate(request.entryDate());
        entry.setActualValue(request.actualValue());
        entry.setTargetValue(request.targetValue());
        entry.setNote(request.note());
    }
}
