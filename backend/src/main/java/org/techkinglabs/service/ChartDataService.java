package org.techkinglabs.service;

import org.techkinglabs.entity.DailyEntry;
import org.techkinglabs.repository.GoalRepository;
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

        Map<Long, BigDecimal> goalTargets = new HashMap<>();
        goalRepository.findAll().forEach(g -> goalTargets.put(g.getId(), g.getTargetValue()));

        boolean weekly = "week".equalsIgnoreCase(range);

        Map<LocalDate, Map<String, Object>> groupedData = new LinkedHashMap<>();
        Map<Long, BigDecimal> runningActual = new HashMap<>();

        // Seed the running cumulative total with entries that fall before the range
        // so the cumulative line stays correct for the first pre-filled buckets.
        if (from != null) {
            entries.stream()
                    .filter(e -> e.getEntryDate().isBefore(from))
                    .forEach(e -> runningActual.merge(e.getGoalId(), e.getActualValue(), BigDecimal::add));

            // Pre-fill every weekly bucket in the bounded range so the x-axis is always full length.
            if (weekly) {
                LocalDate bucket = startOfWeek(from);
                while (!bucket.isAfter(to)) {
                    ensureBucket(bucket, groupedData, goalTargets, runningActual, weekly);
                    bucket = bucket.plusWeeks(1);
                }
            }
        }

        List<DailyEntry> filtered = entries.stream()
                .filter(e -> !e.getEntryDate().isAfter(to))
                .filter(e -> from == null || !e.getEntryDate().isBefore(from))
                .sorted(Comparator.comparing(DailyEntry::getEntryDate))
                .toList();

        for (DailyEntry entry : filtered) {
            LocalDate bucket = weekly ? startOfWeek(entry.getEntryDate()) : entry.getEntryDate();
            groupedData.putIfAbsent(bucket, new LinkedHashMap<>());
            Map<String, Object> bucketData = groupedData.get(bucket);

            long id = entry.getGoalId();
            BigDecimal target = goalTargets.getOrDefault(id, BigDecimal.ZERO);
            runningActual.merge(id, entry.getActualValue(), BigDecimal::add);

            String goalKey = "goal_" + id;
            bucketData.put(goalKey, calculatePercentage(entry));

            BigDecimal totalProgress = (target.equals(BigDecimal.ZERO)) ? BigDecimal.ZERO :
                    (runningActual.get(id).divide(target, 4, java.math.RoundingMode.HALF_UP)).multiply(BigDecimal.valueOf(100l)) ;
            bucketData.put("total_" + id, totalProgress);

            BigDecimal effective = goalService.getEffectiveTarget(id, entry.getEntryDate());
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
                              Map<Long, BigDecimal> goalTargets, Map<Long, BigDecimal> runningActual, boolean weekly) {
        groupedData.putIfAbsent(bucket, new LinkedHashMap<>());
        Map<String, Object> bucketData = groupedData.get(bucket);

        for (Map.Entry<Long, BigDecimal> t : goalTargets.entrySet()) {
            long id = t.getKey();
            BigDecimal target = t.getValue();
            BigDecimal running = runningActual.getOrDefault(id, BigDecimal.ZERO);
            BigDecimal totalProgress = (target.equals(BigDecimal.ZERO)) ? BigDecimal.ZERO : (running.divide(target, 4, java.math.RoundingMode.HALF_UP)).multiply(BigDecimal.valueOf(100L));
            bucketData.putIfAbsent("goal_" + id, BigDecimal.ZERO);
            bucketData.put("total_" + id, totalProgress);
            bucketData.put("target_" + id, goalService.getEffectiveTarget(id, bucket));
        }
        bucketData.putIfAbsent(weekly ? "weekStart" : "entryDate", bucket.toString());
    }

    private BigDecimal calculatePercentage(DailyEntry entry) {
        if (entry.getTargetValue().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return (entry.getActualValue().divide(entry.getTargetValue(), 4, java.math.RoundingMode.HALF_UP)).multiply(BigDecimal.valueOf(100l)) ;
    }
}
