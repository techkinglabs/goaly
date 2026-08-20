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

    // This method was modified to support the refactored controller flow which uses 
    // a mapping approach in the controller for better separation of concerns.
    // We keep it here for direct entity updates from service if needed, but simplified.
    public Goal updateGoalInDb(Goal goal) {
        return goalRepository.save(goal);
    }
    
    public void deleteGoal(Long id) {
        Goal goal = goalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Goal not found with id: " + id));
        
        goalRepository.delete(goal);
    }
}
