package org.example.controller;

import jakarta.validation.Valid;
import org.example.dto.GoalRequest;
import org.example.dto.GoalResponse;
import org.example.entity.Goal;
import org.example.exception.ResourceNotFoundException;
import org.example.mapper.GoalMapper;
import org.example.service.GoalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/goals")
public class GoalController {
    
    @Autowired
    private GoalService goalService;
    
    @GetMapping
    public List<GoalResponse> getAllActiveGoals() {
        return goalService.getAllActiveGoals().stream()
                .map(GoalMapper::toResponse)
                .collect(Collectors.toList());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<GoalResponse> getGoalById(@PathVariable Long id) {
        return goalService.getGoalById(id)
                .map(goal -> ResponseEntity.ok(GoalMapper.toResponse(goal)))
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<GoalResponse> createGoal(@RequestBody @Valid GoalRequest goalRequest) {
        Goal goal = GoalMapper.toEntity(goalRequest);
        Goal createdGoal = goalService.createGoal(goal);
        return ResponseEntity.status(201).body(GoalMapper.toResponse(createdGoal));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<GoalResponse> updateGoal(@PathVariable Long id, @RequestBody @Valid GoalRequest goalRequest) {
        Goal goal = goalService.getGoalById(id).orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + id));
        GoalMapper.updateEntityFromRequest(goalRequest, goal);
        Goal updatedGoal = goalService.updateGoalInDb(goal);
        return ResponseEntity.ok(GoalMapper.toResponse(updatedGoal));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable Long id) {
        goalService.deleteGoal(id);
        return ResponseEntity.noContent().build();
    }
}
