package org.example.service;

import org.example.entity.WeeklyEntry;
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
        // Snapshot the current target value from the goal
        var goal = goalRepository.findById(entry.getGoalId())
                .orElseThrow(() -> new RuntimeException("Goal not found with id: " + entry.getGoalId()));
        
        entry.setTargetValue(goal.getTargetValue());
        
        return weeklyEntryRepository.save(entry);
    }
    
    public WeeklyEntry updateWeeklyEntryInDb(WeeklyEntry entry) {
        // This method ensures that if target value is provided in request, it is used.
        // It also handles the snapshotting logic for new entries via createWeeklyEntry.
        return weeklyEntryRepository.save(entry);
    }
    
    public void deleteWeeklyEntry(Long id) {
        WeeklyEntry entry = weeklyEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Weekly entry not found with id: " + id));
        
        weeklyEntryRepository.delete(entry);
    }
}
