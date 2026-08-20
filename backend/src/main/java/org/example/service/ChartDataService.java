package org.example.service;

import org.example.entity.WeeklyEntry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class ChartDataService {
    
    @Autowired
    private WeeklyEntryService weeklyEntryService;
    
    public List<Map<String, Object>> getChartDataForAllGoals() {
        // This method would return all entries aggregated for visualization
        // It's a simplified approach - in reality you'd need to fetch all goal data and merge
        // For now this is placeholder functionality for the visualization API
        return new ArrayList<>();
    }
    
    public List<Map<String, Object>> getChartDataForGoal(Long goalId) {
        List<WeeklyEntry> entries = weeklyEntryService.getEntriesByGoalId(goalId);
        
        // Group entries by week start date and calculate percentage
        Map<LocalDate, Map<String, Object>> groupedData = new LinkedHashMap<>();
        
        for (WeeklyEntry entry : entries) {
            LocalDate weekStart = entry.getWeekStartDate();
            
            // Initialize data structure for this week if not exists
            groupedData.putIfAbsent(weekStart, new HashMap<>());
            Map<String, Object> weekData = groupedData.get(weekStart);
            
            // Set the goal ID as key (e.g., "goal_1")
            String goalKey = "goal_" + goalId;
            weekData.put("weekStart", weekStart.toString());
            weekData.put(goalKey, calculatePercentage(entry));
        }
        
        // Convert Map to List
        return new ArrayList<>(groupedData.values());
    }
    
    private double calculatePercentage(WeeklyEntry entry) {
        if (entry.getTargetValue().compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }
        return (entry.getActualValue().doubleValue() / entry.getTargetValue().doubleValue()) * 100.0;
    }
}