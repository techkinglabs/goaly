package org.techkinglabs.mapper;

import org.techkinglabs.dto.GoalResponse;
import org.techkinglabs.dto.GoalRequest;
import org.techkinglabs.dto.TargetHistoryResponse;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.entity.TargetHistory;
import java.math.BigDecimal;
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
            goal.getTargetValue(),
            goal.getIsActive(),
            goal.getDescription(),
            goal.getPeriod(),
            goal.getAmountPerPeriod(),
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
            history.getValue(),
            history.getPeriod()
        );
    }

    public static Goal toEntity(GoalRequest request) {
        if (request == null) return null;
        Goal goal = new Goal();
        goal.setName(request.name());
        goal.setUnit(request.unit());
        goal.setTargetValue(request.targetValue());
        goal.setIsActive(request.isActive() != null ? request.isActive() : true);
        goal.setDescription(request.description());
        goal.setPeriod(request.period() != null ? request.period() : "WEEK");
        goal.setAmountPerPeriod(request.amountPerPeriod() != null ? request.amountPerPeriod() : BigDecimal.ZERO);
        return goal;
    }

    public static void updateEntityFromRequest(GoalRequest request, Goal goal) {
        if (request == null || goal == null) return;
        goal.setName(request.name());
        goal.setUnit(request.unit());
        goal.setTargetValue(request.targetValue());
        goal.setIsActive(request.isActive() != null ? request.isActive() : goal.getIsActive());
        goal.setDescription(request.description());
        if (request.period() != null) {
            goal.setPeriod(request.period());
        }
        if (request.amountPerPeriod() != null) {
            goal.setAmountPerPeriod(request.amountPerPeriod());
        }
    }
}
