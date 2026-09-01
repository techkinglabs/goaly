package org.techkinglabs.service;

import org.techkinglabs.dto.ChartDataPoint;
import org.techkinglabs.entity.DailyEntry;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.entity.TargetHistory;
import org.techkinglabs.model.Period;
import org.techkinglabs.repository.GoalRepository;
import org.techkinglabs.repository.TargetHistoryRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

@Service
public class ChartDataService {

    private final DailyEntryService dailyEntryService;
    private final GoalRepository goalRepository;
    private final GoalService goalService;
    private final TargetHistoryRepository targetHistoryRepository;
    private final Clock clock;

    public ChartDataService(DailyEntryService dailyEntryService,
                            GoalRepository goalRepository,
                            GoalService goalService,
                            TargetHistoryRepository targetHistoryRepository,
                            Clock clock) {
        this.dailyEntryService = dailyEntryService;
        this.goalRepository = goalRepository;
        this.goalService = goalService;
        this.targetHistoryRepository = targetHistoryRepository;
        this.clock = clock;
    }

    public List<ChartDataPoint> getChartDataForAllGoals(String range, LocalDate anchor) {
        LocalDate today = LocalDate.now(clock);
        LocalDate anchorDate = anchor != null ? anchor : today;
        LocalDate from = resolveFrom(range, anchorDate);
        List<DailyEntry> entries = dailyEntryService.getEntriesFrom(from);
        List<Goal> goals = goalRepository.findAll();
        Map<Long, List<TargetHistory>> histories = goalService.getTargetHistoryByGoalIds(
                goals.stream().map(Goal::getId).toList());
        return buildSeries(entries, goals, histories, range, anchor);
    }

    public List<ChartDataPoint> getChartDataForGoal(Goal goal, String range, LocalDate anchor) {
        List<DailyEntry> entries = dailyEntryService.getEntriesByGoalId(goal.getId());
        Map<Long, List<TargetHistory>> histories = goalService.getTargetHistoryByGoalIds(List.of(goal.getId()));
        return buildSeries(entries, List.of(goal), histories, range, anchor);
    }

    private List<ChartDataPoint> buildSeries(List<DailyEntry> entries, List<Goal> goals,
                                             Map<Long, List<TargetHistory>> historyByGoal,
                                             String range, LocalDate anchor) {
        LocalDate today = LocalDate.now(clock);
        LocalDate anchorDate = anchor != null ? anchor : today;
        LocalDate to = anchorDate.isAfter(today) ? today : anchorDate;
        LocalDate rawFrom = resolveFrom(range, anchorDate);
        LocalDate from = (rawFrom != null && rawFrom.isAfter(today)) ? today : rawFrom;
        final LocalDate windowFrom = from;
        final LocalDate windowTo = to;

        Map<Long, Period> goalPeriods = new HashMap<>();
        List<Long> goalIds = new ArrayList<>();
        for (Goal g : goals) {
            goalPeriods.put(g.getId(), g.getPeriod());
            goalIds.add(g.getId());
        }

        boolean weekly = "week".equalsIgnoreCase(range);

        Map<LocalDate, ChartDataPoint> groupedData = new LinkedHashMap<>();
        Map<Long, BigDecimal> runningActual = new HashMap<>();
        Map<Long, BigDecimal> runningTarget = new HashMap<>();
        Map<Long, Set<LocalDate>> countedPeriods = new HashMap<>();

        if (windowFrom != null) {
            if (weekly) {
                LocalDate bucket = startOfWeek(windowFrom);
                while (!bucket.isAfter(windowTo)) {
                    ensureBucket(bucket, groupedData, goalIds, goalPeriods, historyByGoal,
                            runningActual, runningTarget, countedPeriods, today, weekly);
                    bucket = bucket.plusWeeks(1);
                }
            } else {
                for (LocalDate day = windowFrom; !day.isAfter(windowTo); day = day.plusDays(1)) {
                    ensureBucket(day, groupedData, goalIds, goalPeriods, historyByGoal,
                            runningActual, runningTarget, countedPeriods, today, weekly);
                }
            }
        }

        List<DailyEntry> filtered = entries.stream()
                .filter(e -> !e.getEntryDate().isAfter(windowTo))
                .filter(e -> windowFrom == null || !e.getEntryDate().isBefore(windowFrom))
                .sorted(Comparator.comparing(DailyEntry::getEntryDate))
                .toList();

        for (DailyEntry entry : filtered) {
            LocalDate bucket = weekly ? startOfWeek(entry.getEntryDate()) : entry.getEntryDate();
            groupedData.putIfAbsent(bucket, new ChartDataPoint(bucket.toString(),
                    new LinkedHashMap<>(), new LinkedHashMap<>(), new LinkedHashMap<>()));
            ChartDataPoint point = groupedData.get(bucket);

            long id = entry.getGoalId();
            runningActual.merge(id, entry.getActualValue(), BigDecimal::add);
            LocalDate periodStart = periodStartFor(id, goalPeriods, entry.getEntryDate());
            creditPeriodTarget(id, periodStart, runningTarget, countedPeriods, today, historyByGoal);

            Map<Long, Double> goalsMap = point.goals();
            goalsMap.put(id, calculatePercentage(entry));
            Map<Long, Double> totalsMap = point.totals();
            double totalProgress = percentage(runningActual.getOrDefault(id, BigDecimal.ZERO),
                    runningTarget.getOrDefault(id, BigDecimal.ZERO));
            totalsMap.put(id, totalProgress);
            Map<Long, Double> targetsMap = point.targets();
            BigDecimal effective = getEffectiveTargetFromHistory(id, entry.getEntryDate(), historyByGoal);
            targetsMap.put(id, effective.doubleValue());

            groupedData.put(bucket, new ChartDataPoint(
                    bucket.toString(),
                    goalsMap, totalsMap, targetsMap
            ));
        }

        return new ArrayList<>(groupedData.values());
    }

    private LocalDate periodStartFor(Long goalId, Map<Long, Period> goalPeriods, LocalDate date) {
        Period period = goalPeriods.getOrDefault(goalId, Period.WEEK);
        return switch (period) {
            case DAY -> date;
            case WEEK, WORKWEEK -> startOfWeek(date);
            case WEEKEND -> date.with(DayOfWeek.SATURDAY);
            case MONTH -> date.withDayOfMonth(1);
            case YEAR -> date.withDayOfYear(1);
        };
    }

    private void creditPeriodTarget(Long goalId, LocalDate periodStart, Map<Long, BigDecimal> runningTarget,
                                    Map<Long, Set<LocalDate>> countedPeriods, LocalDate today,
                                    Map<Long, List<TargetHistory>> historyByGoal) {
        if (!periodStart.isAfter(today)) {
            Set<LocalDate> counted = countedPeriods.computeIfAbsent(goalId, k -> new HashSet<>());
            if (counted.add(periodStart)) {
                BigDecimal target = getEffectiveTargetFromHistory(goalId, periodStart, historyByGoal);
                runningTarget.merge(goalId, target, BigDecimal::add);
            }
        }
    }

    @SuppressWarnings("ReassignedLocalVariable")
    private BigDecimal getEffectiveTargetFromHistory(Long goalId, LocalDate date,
                                                     Map<Long, List<TargetHistory>> historyByGoal) {
        List<TargetHistory> histories = historyByGoal.getOrDefault(goalId, List.of());
        TargetHistory effective = null;
        for (TargetHistory h : histories) {
            if (!h.getValidFrom().isAfter(date)) {
                effective = h;
            } else {
                break;
            }
        }
        return effective != null ? effective.getValue() : BigDecimal.ZERO;
    }

    private LocalDate resolveFrom(String range, LocalDate anchor) {
        if (range == null) return null;
        return switch (range.toLowerCase()) {
            case "7d" -> anchor.minusDays(6);
            case "30d" -> anchor.minusDays(29);
            case "365d" -> anchor.minusDays(364);
            case "week" -> startOfWeek(anchor);
            case "year" -> anchor.withDayOfYear(1);
            default -> null;
        };
    }

    private LocalDate startOfWeek(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    private void ensureBucket(LocalDate bucket, Map<LocalDate, ChartDataPoint> groupedData,
                              List<Long> goalIds, Map<Long, Period> goalPeriods,
                              Map<Long, List<TargetHistory>> historyByGoal,
                              Map<Long, BigDecimal> runningActual, Map<Long, BigDecimal> runningTarget,
                              Map<Long, Set<LocalDate>> countedPeriods, LocalDate today, boolean weekly) {
        groupedData.putIfAbsent(bucket, new ChartDataPoint(bucket.toString(),
                new LinkedHashMap<>(), new LinkedHashMap<>(), new LinkedHashMap<>()));
        ChartDataPoint point = groupedData.get(bucket);

        Map<Long, Double> goalsMap = point.goals();
        Map<Long, Double> totalsMap = point.totals();
        Map<Long, Double> targetsMap = point.targets();

        for (Long id : goalIds) {
            LocalDate periodStart = periodStartFor(id, goalPeriods, bucket);
            creditPeriodTarget(id, periodStart, runningTarget, countedPeriods, today, historyByGoal);
            BigDecimal running = runningActual.getOrDefault(id, BigDecimal.ZERO);
            BigDecimal runningTgt = runningTarget.getOrDefault(id, BigDecimal.ZERO);
            double totalProgress = percentage(running, runningTgt);
            goalsMap.putIfAbsent(id, 0.0);
            totalsMap.put(id, totalProgress);
            BigDecimal effective = getEffectiveTargetFromHistory(id, bucket, historyByGoal);
            targetsMap.put(id, effective.doubleValue());
        }
        groupedData.put(bucket, new ChartDataPoint(
                bucket.toString(),
                goalsMap, totalsMap, targetsMap
        ));
    }

    private double calculatePercentage(DailyEntry entry) {
        if (entry.getTargetValue().compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }
        return percentage(entry.getActualValue(), entry.getTargetValue());
    }

    private double percentage(BigDecimal actual, BigDecimal target) {
        if (target.compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }
        return actual.divide(target, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();
    }
}
