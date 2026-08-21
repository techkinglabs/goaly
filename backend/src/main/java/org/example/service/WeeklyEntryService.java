package org.example.service;

import org.example.entity.Goal;
import org.example.entity.WeeklyEntry;
import org.example.exception.DuplicateWeekException;
import org.example.exception.ResourceNotFoundException;
import org.example.repository.WeeklyEntryRepository;
import org.example.repository.GoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class WeeklyEntryService {
    
    @Autowired
    private WeeklyEntryRepository weeklyEntryRepository;
    
    @Autowired
    private GoalRepository goalRepository;
    
    public List<WeeklyEntry> getEntriesByGoalId(Long goalId) {
        return weeklyEntryRepository.findByGoalIdOrderByWeekStartDate(goalId);
    }
    
    public List<WeeklyEntry> getAllEntries() {
        return weeklyEntryRepository.findAll();
    }
    
    public Optional<WeeklyEntry> getEntryById(Long id) {
        return weeklyEntryRepository.findById(id);
    }
    
    public WeeklyEntry createWeeklyEntry(WeeklyEntry entry) {
        Goal goal = goalRepository.findById(entry.getGoalId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + entry.getGoalId()));

        if (weeklyEntryRepository.existsByGoalIdAndWeekStartDate(entry.getGoalId(), entry.getWeekStartDate())) {
            throw new DuplicateWeekException("An entry for goal " + entry.getGoalId()
                    + " and week starting " + entry.getWeekStartDate() + " already exists");
        }

        // Snapshot the current target value from the goal; the request value is ignored.
        entry.setTargetValue(goal.getTargetValue());

        return weeklyEntryRepository.save(entry);
    }

    public WeeklyEntry updateWeeklyEntryInDb(WeeklyEntry entry) {
        // Always re-snapshot the target value from the associated goal so it stays
        // consistent with the goal's definition, regardless of what the client sent.
        Goal goal = goalRepository.findById(entry.getGoalId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + entry.getGoalId()));

        entry.setTargetValue(goal.getTargetValue());

        return weeklyEntryRepository.save(entry);
    }
    
    public void deleteWeeklyEntry(Long id) {
        WeeklyEntry entry = weeklyEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Weekly entry not found with id: " + id));
        
        weeklyEntryRepository.delete(entry);
    }
}
