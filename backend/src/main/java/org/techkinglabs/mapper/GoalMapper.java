package org.techkinglabs.mapper;

import org.techkinglabs.dto.GoalResponse;
import org.techkinglabs.dto.GoalRequest;
import org.techkinglabs.dto.TargetHistoryResponse;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.entity.TargetHistory;
import java.util.List;
import java.util.stream.Collectors;

public class GoalMapper {
    public static GoalResponse toResponse(Goal goal, List<TargetHistory> targetHistory) {
        if (goal == null) return null;
        List<TargetHistoryResponse> history = List.of();
        if (targetHistory != null) {
            history = targetHistory.stream()
                    .map(GoalMapper::toTargetHistoryResponse)
                    .collect(Collectors.toList());
        }
        return new GoalResponse(
            goal.getId(),
            goal.getName(),
            goal.getUnit(),
            goal.isActive(),
            goal.getDescription(),
            history
        );
    }

    public static TargetHistoryResponse toTargetHistoryResponse(TargetHistory history) {
        if (history == null) return null;
        return new TargetHistoryResponse(
            history.getId(),
            history.getGoalId(),
            history.getValidFrom(),
            history.getValidTo(),
            history.getTargetValue(),
            history.getPeriod()
        );
    }

    public static Goal toEntity(GoalRequest request) {
        if (request == null) return null;
        Goal goal = new Goal();
        goal.setName(request.name());
        goal.setUnit(request.unit());
        goal.setActive(request.active() != null ? request.active() : true);
        goal.setDescription(request.description());
        // targetValue/period/amountPerPeriod are now managed exclusively via
        // TargetHistory; Goal itself no longer carries them.
        return goal;
    }

    public static void updateEntityFromRequest(GoalRequest request, Goal goal) {
        if (request == null || goal == null) return;
        goal.setName(request.name());
        goal.setUnit(request.unit());
        if (request.active() != null) {
            goal.setActive(request.active());
        }
        goal.setDescription(request.description());
    }
}
