package org.techkinglabs.mapper;

import org.techkinglabs.dto.DailyEntryResponse;
import org.techkinglabs.dto.DailyEntryRequest;
import org.techkinglabs.entity.DailyEntry;
import java.math.BigDecimal;

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
        // targetValue is server-derived from the effective target history, never a client input.
        entry.setTargetValue(BigDecimal.ZERO);
        entry.setNote(request.note());
        return entry;
    }

    public static void updateEntityFromRequest(DailyEntryRequest request, DailyEntry entry) {
        if (request == null || entry == null) return;
        entry.setGoalId(request.goalId());
        entry.setEntryDate(request.entryDate());
        entry.setActualValue(request.actualValue());
        entry.setNote(request.note());
        // targetValue is intentionally not applied here so that the service re-derives it.
    }
}
