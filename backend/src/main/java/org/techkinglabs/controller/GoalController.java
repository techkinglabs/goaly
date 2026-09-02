package org.techkinglabs.controller;

import jakarta.validation.Valid;
import org.techkinglabs.dto.GoalRequest;
import org.techkinglabs.dto.GoalResponse;
import org.techkinglabs.dto.TargetHistoryResponse;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.entity.TargetHistory;
import org.techkinglabs.exception.ResourceNotFoundException;
import org.techkinglabs.mapper.GoalMapper;
import org.techkinglabs.model.Period;
import org.techkinglabs.service.GoalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService goalService;

    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    @GetMapping
    public List<GoalResponse> getAllActiveGoals(@RequestParam(required = false) Boolean active) {
        List<Goal> goals = goalService.getGoals(active);
        List<Long> goalIds = goals.stream().map(Goal::getId).toList();
        Map<Long, List<TargetHistory>> histories = goalService.getTargetHistoryByGoalIds(goalIds);
        return goals.stream()
                .map(g -> GoalMapper.toResponse(g, histories.get(g.getId())))
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GoalResponse> getGoalById(@PathVariable Long id) {
        return goalService.getGoalById(id)
                .map(goal -> ResponseEntity.ok(GoalMapper.toResponse(goal, goalService.getTargetHistory(goal.getId()))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<GoalResponse> createGoal(@RequestBody @Valid GoalRequest goalRequest) {
        Goal goal = GoalMapper.toEntity(goalRequest);
        Goal createdGoal = goalService.createGoal(goal);
        return ResponseEntity.status(201).body(GoalMapper.toResponse(createdGoal, goalService.getTargetHistory(createdGoal.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GoalResponse> updateGoal(@PathVariable Long id, @RequestBody @Valid GoalRequest goalRequest) {
        Goal goal = goalService.getGoalById(id).orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + id));
        GoalMapper.updateEntityFromRequest(goalRequest, goal);
        Goal updatedGoal = goalService.updateGoal(goal);
        return ResponseEntity.ok(GoalMapper.toResponse(updatedGoal, goalService.getTargetHistory(updatedGoal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable Long id) {
        goalService.deleteGoal(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/target")
    public ResponseEntity<TargetHistoryResponse> addTargetHistory(
            @PathVariable Long id,
            @RequestParam LocalDate validFrom,
            @RequestParam(required = false) LocalDate validTo,
            @RequestParam BigDecimal value,
            @RequestParam(required = false, defaultValue = "WEEK") String period) {
        Period parsedPeriod = Period.fromValue(period);
        TargetHistory history = goalService.addTargetHistory(id, validFrom, validTo, value, parsedPeriod);
        return ResponseEntity.status(201).body(GoalMapper.toTargetHistoryResponse(history));
    }

    @GetMapping("/{id}/target")
    public List<TargetHistoryResponse> getTargetHistory(@PathVariable Long id) {
        return goalService.getTargetHistory(id).stream()
                .map(GoalMapper::toTargetHistoryResponse)
                .collect(Collectors.toList());
    }

    @PutMapping("/{id}/target/{historyId}")
    public ResponseEntity<TargetHistoryResponse> updateTargetHistory(
            @PathVariable Long id,
            @PathVariable Long historyId,
            @RequestParam LocalDate validFrom,
            @RequestParam(required = false) LocalDate validTo,
            @RequestParam BigDecimal value,
            @RequestParam(required = false, defaultValue = "WEEK") String period) {
        Period parsedPeriod = Period.fromValue(period);
        TargetHistory history = goalService.updateTargetHistory(id, historyId, validFrom, validTo, value, parsedPeriod);
        return ResponseEntity.ok(GoalMapper.toTargetHistoryResponse(history));
    }

    @DeleteMapping("/{id}/target/{historyId}")
    public ResponseEntity<Void> deleteTargetHistory(@PathVariable Long id, @PathVariable Long historyId) {
        goalService.deleteTargetHistory(id, historyId);
        return ResponseEntity.noContent().build();
    }
}
