package org.example.service;

import org.example.entity.Goal;
import org.example.repository.GoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class GoalService {
    
    @Autowired
    private GoalRepository goalRepository;
    
    public List<Goal> getAllActiveGoals() {
        return goalRepository.findByIsActiveTrue();
    }
    
    public Optional<Goal> getGoalById(Long id) {
        return goalRepository.findById(id);
    }
    
    public Goal createGoal(Goal goal) {
        return goalRepository.save(goal);
    }
    
    public Goal updateGoal(Long id, Goal goalDetails) {
        Goal goal = goalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Goal not found with id: " + id));
        
        goal.setName(goalDetails.getName());
        goal.setUnit(goalDetails.getUnit());
        goal.setTargetValue(goalDetails.getTargetValue());
        goal.setIsActive(goalDetails.getIsActive());
        
        return goalRepository.save(goal);
    }
    
    public void deleteGoal(Long id) {
        Goal goal = goalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Goal not found with id: " + id));
        
        goalRepository.delete(goal);
    }
}