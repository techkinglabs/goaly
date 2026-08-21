package org.example.service;

import org.example.entity.WeeklyEntry;
import org.example.repository.GoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class ChartDataService {

    @Autowired
    private WeeklyEntryService weeklyEntryService;

    @Autowired
    private GoalRepository goalRepository;

    public List<Map<String, Object>> getChartDataForAllGoals() {
        List<WeeklyEntry> allEntries = weeklyEntryService.getAllEntries();
        allEntries.sort(Comparator.comparing(WeeklyEntry::getWeekStartDate));

        // Fixed target value per goal (cumulative progress is measured against the goal's target)
        Map<Long, Double> goalTargets = new HashMap<>();
        goalRepository.findAll().forEach(g -> goalTargets.put(g.getId(), g.getTargetValue().doubleValue()));

        Map<LocalDate, Map<String, Object>> groupedData = new LinkedHashMap<>();
        Map<Long, Double> runningActual = new HashMap<>();

        for (WeeklyEntry entry : allEntries) {
            LocalDate weekStart = entry.getWeekStartDate();
            groupedData.putIfAbsent(weekStart, new HashMap<>());
            Map<String, Object> weekData = groupedData.get(weekStart);

            long id = entry.getGoalId();
            double target = goalTargets.getOrDefault(id, 0.0);
            runningActual.merge(id, entry.getActualValue().doubleValue(), Double::sum);

            String goalKey = "goal_" + id;
            weekData.put(goalKey, calculatePercentage(entry));

            double totalProgress = (target == 0.0) ? 0.0 :
                    Math.min((runningActual.get(id) / target) * 100.0, 100.0);
            weekData.put("total_" + id, totalProgress);

            weekData.put("weekStart", weekStart.toString());
        }

        return new ArrayList<>(groupedData.values());
    }

    public List<Map<String, Object>> getChartDataForGoal(Long goalId) {
        List<WeeklyEntry> entries = weeklyEntryService.getEntriesByGoalId(goalId);
        entries.sort(Comparator.comparing(WeeklyEntry::getWeekStartDate));

        double goalTarget = goalRepository.findById(goalId)
                .map(g -> g.getTargetValue().doubleValue())
                .orElse(0.0);

        Map<LocalDate, Map<String, Object>> groupedData = new LinkedHashMap<>();
        double runningActual = 0.0;

        for (WeeklyEntry entry : entries) {
            LocalDate weekStart = entry.getWeekStartDate();
            groupedData.putIfAbsent(weekStart, new HashMap<>());
            Map<String, Object> weekData = groupedData.get(weekStart);

            runningActual += entry.getActualValue().doubleValue();

            String goalKey = "goal_" + goalId;
            weekData.put("weekStart", weekStart.toString());
            weekData.put(goalKey, calculatePercentage(entry));

            double totalProgress = (goalTarget == 0.0) ? 0.0 :
                    Math.min((runningActual / goalTarget) * 100.0, 100.0);
            weekData.put("total_" + goalId, totalProgress);
        }

        return new ArrayList<>(groupedData.values());
    }

    private double calculatePercentage(WeeklyEntry entry) {
        if (entry.getTargetValue().compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }
        return (entry.getActualValue().doubleValue() / entry.getTargetValue().doubleValue()) * 100.0;
    }
}
