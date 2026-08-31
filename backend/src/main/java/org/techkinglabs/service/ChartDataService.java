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
        Map<Long, String> goalPeriods = new HashMap<>();
        goalRepository.findAll().forEach(g -> {
            goalTargets.put(g.getId(), g.getTargetValue());
            goalPeriods.put(g.getId(), g.getPeriod());
        });

        boolean weekly = "week".equalsIgnoreCase(range);

        Map<LocalDate, Map<String, Object>> groupedData = new LinkedHashMap<>();
        Map<Long, BigDecimal> runningActual = new HashMap<>();
        // Cumulative "Total %" is measured against the *period* targets that have
        // elapsed within the visible window, not an all-time fixed target.
        Map<Long, BigDecimal> runningTarget = new HashMap<>();
        Map<Long, Set<LocalDate>> countedPeriods = new HashMap<>();

        // The cumulative "Total %" line accumulates only within the visible range
        // (it starts at 0 at the range start and grows as entries are logged), so a
        // new week begins at 0 instead of carrying over all-time history.
        // Pre-fill every bucket in the bounded range so the x-axis is always full
        // length and the cumulative line is continuous (including empty days).
        if (from != null) {
            if (weekly) {
                LocalDate bucket = startOfWeek(from);
                while (!bucket.isAfter(to)) {
                    ensureBucket(bucket, groupedData, goalTargets, goalPeriods, runningActual, runningTarget, countedPeriods, weekly);
                    bucket = bucket.plusWeeks(1);
                }
            } else {
                for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
                    ensureBucket(day, groupedData, goalTargets, goalPeriods, runningActual, runningTarget, countedPeriods, weekly);
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
            // Credit the period target the first time a new period is reached.
            LocalDate periodStart = periodStartFor(id, goalPeriods, entry.getEntryDate());
            creditPeriodTarget(id, periodStart, runningTarget, countedPeriods);

            String goalKey = "goal_" + id;
            bucketData.put(goalKey, calculatePercentage(entry));

            BigDecimal totalProgress = runningTarget.getOrDefault(id, BigDecimal.ZERO).compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO :
                    (runningActual.get(id).divide(runningTarget.get(id), 4, java.math.RoundingMode.HALF_UP)).multiply(BigDecimal.valueOf(100L));
            bucketData.put("total_" + id, totalProgress);

            BigDecimal effective = goalService.getEffectiveTarget(id, entry.getEntryDate());
            bucketData.put("target_" + id, effective);

            bucketData.put(weekly ? "weekStart" : "entryDate", bucket.toString());
        }

        return new ArrayList<>(groupedData.values());
    }

    private LocalDate periodStartFor(Long goalId, Map<Long, String> goalPeriods, LocalDate date) {
        String period = goalPeriods.getOrDefault(goalId, "WEEK");
        if (period == null) period = "WEEK";
        switch (period.toUpperCase()) {
            case "DAY":
                return date;
            case "WEEK":
            case "WORKWEEK":
                return startOfWeek(date);
            case "WEEKEND":
                return date.with(DayOfWeek.SATURDAY);
            case "MONTH":
                return date.withDayOfMonth(1);
            case "YEAR":
                return date.withDayOfYear(1);
            default:
                return startOfWeek(date);
        }
    }

    private void creditPeriodTarget(Long goalId, LocalDate periodStart, Map<Long, BigDecimal> runningTarget,
                                    Map<Long, Set<LocalDate>> countedPeriods) {
        Set<LocalDate> counted = countedPeriods.computeIfAbsent(goalId, k -> new HashSet<>());
        if (counted.add(periodStart)) {
            BigDecimal target = goalService.getEffectiveTarget(goalId, periodStart);
            runningTarget.merge(goalId, target, BigDecimal::add);
        }
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
                return anchor.withDayOfYear(1);
            case "all":
            default:
                return null;
        }
    }

    private LocalDate startOfWeek(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    private void ensureBucket(LocalDate bucket, Map<LocalDate, Map<String, Object>> groupedData,
                              Map<Long, BigDecimal> goalTargets, Map<Long, String> goalPeriods,
                              Map<Long, BigDecimal> runningActual, Map<Long, BigDecimal> runningTarget,
                              Map<Long, Set<LocalDate>> countedPeriods, boolean weekly) {
        groupedData.putIfAbsent(bucket, new LinkedHashMap<>());
        Map<String, Object> bucketData = groupedData.get(bucket);

        for (Map.Entry<Long, BigDecimal> t : goalTargets.entrySet()) {
            long id = t.getKey();
            BigDecimal target = t.getValue();
            // Credit the period target for this prefilled bucket (an empty week).
            LocalDate periodStart = periodStartFor(id, goalPeriods, bucket);
            creditPeriodTarget(id, periodStart, runningTarget, countedPeriods);
            BigDecimal running = runningActual.getOrDefault(id, BigDecimal.ZERO);
            BigDecimal runningTgt = runningTarget.getOrDefault(id, BigDecimal.ZERO);
            BigDecimal totalProgress = runningTgt.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO :
                    (running.divide(runningTgt, 4, java.math.RoundingMode.HALF_UP)).multiply(BigDecimal.valueOf(100L));
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
        return (entry.getActualValue().divide(entry.getTargetValue(), 4, java.math.RoundingMode.HALF_UP)).multiply(BigDecimal.valueOf(100)) ;
    }
}
