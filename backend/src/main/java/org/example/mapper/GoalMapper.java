package org.example.mapper;

import org.example.dto.GoalResponse;
import org.example.dto.GoalRequest;
import org.example.entity.Goal;

public class GoalMapper {
    public static GoalResponse toResponse(Goal goal) {
        if (goal == null) return null;
        return new GoalResponse(
            goal.getId(),
            goal.getName(),
            goal.getUnit(),
            goal.getTargetValue(),
            goal.getIsActive(),
            goal.getDescription(),
            goal.getDaysOfWeek()
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
        goal.setDaysOfWeek(request.daysOfWeek());
        return goal;
    }

    public static void updateEntityFromRequest(GoalRequest request, Goal goal) {
        if (request == null || goal == null) return;
        goal.setName(request.name());
        goal.setUnit(request.unit());
        goal.setTargetValue(request.targetValue());
        goal.setIsActive(request.isActive() != null ? request.isActive() : goal.getIsActive());
        goal.setDescription(request.description());
        goal.setDaysOfWeek(request.daysOfWeek());
    }
}
