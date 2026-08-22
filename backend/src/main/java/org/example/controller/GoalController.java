package org.example.controller;

import jakarta.validation.Valid;
import org.example.dto.GoalRequest;
import org.example.dto.GoalResponse;
import org.example.dto.TargetHistoryResponse;
import org.example.entity.Goal;
import org.example.entity.TargetHistory;
import org.example.exception.ResourceNotFoundException;
import org.example.mapper.GoalMapper;
import org.example.repository.TargetHistoryRepository;
import org.example.service.GoalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    @Autowired
    private GoalService goalService;

    @Autowired
    private TargetHistoryRepository targetHistoryRepository;

    @GetMapping
    public List<GoalResponse> getAllActiveGoals() {
        return goalService.getAllActiveGoals().stream()
                .map(goal -> GoalMapper.toResponse(goal, targetHistoryRepository))
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GoalResponse> getGoalById(@PathVariable Long id) {
        return goalService.getGoalById(id)
                .map(goal -> ResponseEntity.ok(GoalMapper.toResponse(goal, targetHistoryRepository)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<GoalResponse> createGoal(@RequestBody @Valid GoalRequest goalRequest) {
        Goal goal = GoalMapper.toEntity(goalRequest);
        Goal createdGoal = goalService.createGoal(goal);
        return ResponseEntity.status(201).body(GoalMapper.toResponse(createdGoal, targetHistoryRepository));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GoalResponse> updateGoal(@PathVariable Long id, @RequestBody @Valid GoalRequest goalRequest) {
        Goal goal = goalService.getGoalById(id).orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + id));
        GoalMapper.updateEntityFromRequest(goalRequest, goal);
        Goal updatedGoal = goalService.updateGoalInDb(goal);
        return ResponseEntity.ok(GoalMapper.toResponse(updatedGoal, targetHistoryRepository));
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
        TargetHistory history = goalService.addTargetHistory(id, validFrom, validTo, value, period);
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
        TargetHistory history = goalService.updateTargetHistory(id, historyId, validFrom, validTo, value, period);
        return ResponseEntity.ok(GoalMapper.toTargetHistoryResponse(history));
    }

    @DeleteMapping("/{id}/target/{historyId}")
    public ResponseEntity<Void> deleteTargetHistory(@PathVariable Long id, @PathVariable Long historyId) {
        goalService.deleteTargetHistory(id, historyId);
        return ResponseEntity.noContent().build();
    }
}
