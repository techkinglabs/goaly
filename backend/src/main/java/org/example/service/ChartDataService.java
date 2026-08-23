package org.example.service;

import org.example.entity.DailyEntry;
import org.example.entity.Goal;
import org.example.repository.GoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChartDataService {

    @Autowired
    private DailyEntryService dailyEntryService;

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private GoalService goalService;

    public List<Map<String, Object>> getChartDataForAllGoals(String range, LocalDate anchor) {
        List<DailyEntry> allEntries = dailyEntryService.getAllEntries();
        return buildSeries(allEntries, null, range, anchor);
    }

    public List<Map<String, Object>> getChartDataForGoal(Long goalId, String range, LocalDate anchor) {
        List<DailyEntry> entries = dailyEntryService.getEntriesByGoalId(goalId);
        return buildSeries(entries, goalId, range, anchor);
    }

    private List<Map<String, Object>> buildSeries(List<DailyEntry> entries, Long singleGoalId, String range, LocalDate anchor) {
        LocalDate anchorDate = anchor != null ? anchor : LocalDate.now();
        LocalDate from = resolveFrom(range, anchorDate);
        LocalDate to = anchorDate;

        Map<Long, Double> goalTargets = new HashMap<>();
        goalRepository.findAll().forEach(g -> goalTargets.put(g.getId(), g.getTargetValue().doubleValue()));

        boolean weekly = "week".equalsIgnoreCase(range);

        Map<LocalDate, Map<String, Object>> groupedData = new LinkedHashMap<>();
        Map<Long, Double> runningActual = new HashMap<>();

        // Seed the running cumulative total with entries that fall before the range
        // so the cumulative line stays correct for the first pre-filled buckets.
        if (from != null) {
            entries.stream()
                    .filter(e -> e.getEntryDate().isBefore(from))
                    .forEach(e -> runningActual.merge(e.getGoalId(), e.getActualValue().doubleValue(), Double::sum));

            // Pre-fill every bucket in the bounded range so the x-axis is always full length.
            if (weekly) {
                LocalDate bucket = startOfWeek(from);
                while (!bucket.isAfter(to)) {
                    ensureBucket(bucket, groupedData, goalTargets, runningActual, weekly);
                    bucket = bucket.plusWeeks(1);
                }
            } else {
                LocalDate bucket = from;
                while (!bucket.isAfter(to)) {
                    ensureBucket(bucket, groupedData, goalTargets, runningActual, weekly);
                    bucket = bucket.plusDays(1);
                }
            }
        }

        List<DailyEntry> filtered = entries.stream()
                .filter(e -> !e.getEntryDate().isAfter(to))
                .filter(e -> from == null || !e.getEntryDate().isBefore(from))
                .sorted(Comparator.comparing(DailyEntry::getEntryDate))
                .collect(Collectors.toList());

        for (DailyEntry entry : filtered) {
            LocalDate bucket = weekly ? startOfWeek(entry.getEntryDate()) : entry.getEntryDate();
            groupedData.putIfAbsent(bucket, new LinkedHashMap<>());
            Map<String, Object> bucketData = groupedData.get(bucket);

            long id = entry.getGoalId();
            double target = goalTargets.getOrDefault(id, 0.0);
            runningActual.merge(id, entry.getActualValue().doubleValue(), Double::sum);

            String goalKey = "goal_" + id;
            bucketData.put(goalKey, calculatePercentage(entry));

            double totalProgress = (target == 0.0) ? 0.0 :
                    (runningActual.get(id) / target) * 100.0;
            bucketData.put("total_" + id, totalProgress);

            double effective = goalService.getEffectiveTarget(id, entry.getEntryDate()).doubleValue();
            bucketData.put("target_" + id, effective);

            bucketData.put(weekly ? "weekStart" : "entryDate", bucket.toString());
        }

        return new ArrayList<>(groupedData.values());
    }

    private LocalDate resolveFrom(String range, LocalDate anchor) {
        if (range == null) return null;
        switch (range.toLowerCase()) {
            case "7d":
                return anchor.minusDays(6);
            case "30d":
                return anchor.minusDays(29);
            case "365d":
                return anchor.minusDays(364);
            case "week":
                return startOfWeek(anchor);
            case "year":
                return LocalDate.now().withDayOfYear(1);
            case "all":
            default:
                return null;
        }
    }

    private LocalDate startOfWeek(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    private void ensureBucket(LocalDate bucket, Map<LocalDate, Map<String, Object>> groupedData,
                              Map<Long, Double> goalTargets, Map<Long, Double> runningActual, boolean weekly) {
        groupedData.putIfAbsent(bucket, new LinkedHashMap<>());
        Map<String, Object> bucketData = groupedData.get(bucket);

        for (Map.Entry<Long, Double> t : goalTargets.entrySet()) {
            long id = t.getKey();
            double target = t.getValue();
            double running = runningActual.getOrDefault(id, 0.0);
            double totalProgress = (target == 0.0) ? 0.0 : (running / target) * 100.0;

            bucketData.putIfAbsent("goal_" + id, 0.0);
            bucketData.put("total_" + id, totalProgress);
            bucketData.put("target_" + id, goalService.getEffectiveTarget(id, bucket).doubleValue());
        }
        bucketData.putIfAbsent(weekly ? "weekStart" : "entryDate", bucket.toString());
    }

    private double calculatePercentage(DailyEntry entry) {
        if (entry.getTargetValue().compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }
        return (entry.getActualValue().doubleValue() / entry.getTargetValue().doubleValue()) * 100.0;
    }
}
