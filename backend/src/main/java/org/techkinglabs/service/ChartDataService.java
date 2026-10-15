package org.techkinglabs.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.techkinglabs.dto.ChartDataPoint;
import org.techkinglabs.dto.DailyEntryChartView;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.entity.TargetHistory;
import org.techkinglabs.model.Period;
import org.techkinglabs.repository.DailyEntryRepository;
import org.techkinglabs.repository.GoalRepository;
import org.techkinglabs.repository.TargetHistoryRepository;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChartDataService {

    private final DailyEntryRepository dailyEntryRepository;
    private final GoalRepository goalRepository;
    private final TargetHistoryRepository targetHistoryRepository;
    private final Clock clock;

    public ChartDataService(DailyEntryRepository dailyEntryRepository,
                             GoalRepository goalRepository,
                             TargetHistoryRepository targetHistoryRepository,
                             Clock clock) {
        this.dailyEntryRepository = dailyEntryRepository;
        this.goalRepository = goalRepository;
        this.targetHistoryRepository = targetHistoryRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ChartDataPoint> getChartDataForAllGoals(String range, LocalDate anchor) {
        LocalDate today = LocalDate.now(clock);
        LocalDate anchorDate = anchor != null ? anchor : today;
        LocalDate from = calculateFromRange(range, anchorDate);

        List<Goal> goals = goalRepository.findAll();
        if (goals.isEmpty()) {
            return List.of();
        }

        List<Long> goalIds = goals.stream().map(Goal::getId).toList();
        List<TargetHistory> allHistories = targetHistoryRepository.findByGoalIdInOrderByGoalIdAscValidFromAsc(goalIds);
        Map<Long, List<TargetHistory>> historiesByGoal = allHistories.stream()
                .collect(Collectors.groupingBy(TargetHistory::getGoalId,
                        Collectors.collectingAndThen(Collectors.toList(), list -> {
                            list.sort(Comparator.comparing(TargetHistory::getValidFrom));
                            return list;
                        })));

        // Determine the overall date range
        if (from == null) {
            List<LocalDate> earliestDates = new ArrayList<>();
            for (Goal g : goals) {
                LocalDate earliest = dailyEntryRepository.findMinEntryDateByGoalId(g.getId());
                if (earliest != null) {
                    earliestDates.add(earliest);
                }
            }
            if (earliestDates.isEmpty()) {
                return List.of();
            }
            from = earliestDates.stream().min(LocalDate::compareTo).orElse(null);
        }

        // Fetch chart data for each goal using the SQL query
        Map<Goal, List<DailyEntryChartView>> viewsByGoal = new HashMap<>();
        for (Goal g : goals) {
            List<DailyEntryChartView> views = dailyEntryRepository
                    .findChartDataByGoalIdAndDateBetween(g.getId(), from, anchorDate);
            if (!views.isEmpty()) {
                viewsByGoal.put(g, views);
            }
        }

        // Merge all goals' views by date
        Map<LocalDate, Map<Long, BigDecimal>> dailyValuesByDate = mergeViewsByDate(viewsByGoal);

        return buildMergedSeries(dailyValuesByDate, historiesByGoal, goals, from, anchorDate);
    }

    @Transactional(readOnly = true)
    public List<ChartDataPoint> getChartDataForGoal(Goal goal, String range, LocalDate endInterval) {
        Long goalId = goal.getId();
        LocalDate today = LocalDate.now(clock);
        endInterval = endInterval != null ? endInterval : today;
        LocalDate from = calculateFromRange(range, endInterval);

        if (from == null) {
            LocalDate earliest = dailyEntryRepository.findMinEntryDateByGoalId(goalId);
            if (earliest == null) {
                return List.of();
            }
            from = earliest;
        }

        List<DailyEntryChartView> views = dailyEntryRepository.findChartDataByGoalIdAndDateBetween(goalId, from, endInterval);
        if (views.isEmpty()) {
            return List.of();
        }

        List<TargetHistory> histories = targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId);
        Map<Long, List<TargetHistory>> historiesByGoal = Map.of(goalId, histories);
        Map<Goal, List<DailyEntryChartView>> viewsByGoal = Map.of(goal, views);

        Map<LocalDate, Map<Long, BigDecimal>> dailyValuesByDate = mergeViewsByDate(viewsByGoal);

        return buildMergedSeries(dailyValuesByDate, historiesByGoal, List.of(goal), from, endInterval);
    }

    private Map<LocalDate, Map<Long, BigDecimal>> mergeViewsByDate(Map<Goal, List<DailyEntryChartView>> viewsByGoal) {
        Map<LocalDate, Map<Long, BigDecimal>> result = new TreeMap<>();
        for (Map.Entry<Goal, List<DailyEntryChartView>> entry : viewsByGoal.entrySet()) {
            Long goalId = entry.getKey().getId();
            for (DailyEntryChartView v : entry.getValue()) {
                result.computeIfAbsent(v.entryDate(), _ -> new HashMap<>())
                        .merge(goalId,
                                v.actualValue() != null ? v.actualValue() : BigDecimal.ZERO,
                                BigDecimal::add);
            }
        }
        return result;
    }

    private List<ChartDataPoint> buildMergedSeries(Map<LocalDate, Map<Long, BigDecimal>> dailyValuesByDate,
                                                   Map<Long, List<TargetHistory>> historiesByGoal,
                                                   List<Goal> goals,
                                                   LocalDate from,
                                                   LocalDate to) {

        if (dailyValuesByDate.isEmpty()) {
            return List.of();
        }

        Set<Long> goalIds = goals.stream().map(Goal::getId).collect(Collectors.toCollection(LinkedHashSet::new));

        // Per-goal running actual (only grows).
        Map<Long, BigDecimal> runningActual = new HashMap<>();
        for (Long gid : goalIds) {
            runningActual.put(gid, BigDecimal.ZERO);
        }

        // Fixed window denominator per goal: sum of period targets for every
        // unique period-start in [from, to]. Because this denominator is fixed
        // and `runningActual` only grows, `runningActual / windowTarget` is
        // monotonically non-decreasing — once cumulative exceeds 100% (e.g.
        // the user did a full week plus more in subsequent weeks), it keeps
        // climbing rather than plateauing at 100%.
        Map<Long, BigDecimal> windowTarget = new HashMap<>();
        for (Long gid : goalIds) {
            List<TargetHistory> histories = historiesByGoal.getOrDefault(gid, List.of());
            Set<String> creditedPeriods = new HashSet<>();
            BigDecimal target = BigDecimal.ZERO;
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                Period period = getEffectivePeriod(histories, d);
                LocalDate ps = periodStartFor(d, period);
                String psKey = gid + ":" + ps.toString();
                if (!creditedPeriods.contains(psKey)) {
                    target = target.add(getEffectiveTarget(histories, d));
                    creditedPeriods.add(psKey);
                }
            }
            windowTarget.put(gid, target);
        }

        List<LocalDate> allDates = dailyValuesByDate.keySet().stream().sorted().toList();
        int totalCount = allDates.size();
        List<ChartDataPoint> points = new ArrayList<>();

        for (int i = 0; i < totalCount; i++) {
            LocalDate date = allDates.get(i);
            Map<Long, BigDecimal> dailyMap = dailyValuesByDate.getOrDefault(date, Map.of());

            Map<Long, Double> goalsMap = new HashMap<>();
            Map<Long, Double> totalsMap = new HashMap<>();
            Map<Long, Double> targetsMap = new HashMap<>();
            Map<Long, Double> idealPathsMap = new HashMap<>();
            Map<Long, Double> cumulativeRawMap = new HashMap<>();
            Map<Long, Double> dailyRawMap = new HashMap<>();

            for (Long gid : goalIds) {
                List<TargetHistory> histories = historiesByGoal.getOrDefault(gid, List.of());
                BigDecimal effectiveTarget = getEffectiveTarget(histories, date);

                BigDecimal dailyActual = dailyMap.getOrDefault(gid, BigDecimal.ZERO);
                BigDecimal rActual = runningActual.get(gid).add(dailyActual);
                runningActual.put(gid, rActual);

                BigDecimal wTarget = windowTarget.get(gid);

                // Daily and cumulative share the same fixed denominator, so a
                // single day's contribution can never exceed the cumulative
                // percentage on the chart.
                BigDecimal dailyProgress = wTarget.compareTo(BigDecimal.ZERO) > 0 && dailyActual.compareTo(BigDecimal.ZERO) > 0
                        ? BigDecimal.valueOf((dailyActual.doubleValue() / wTarget.doubleValue()) * 100)
                        : BigDecimal.ZERO;

                BigDecimal cumulative = wTarget.compareTo(BigDecimal.ZERO) > 0
                        ? BigDecimal.valueOf((rActual.doubleValue() / wTarget.doubleValue()) * 100)
                        : BigDecimal.ZERO;

                // Ideal path: linear 0→100 across all date points
                double idealPct = totalCount > 1 ? (i / (totalCount - 1.0)) * 100.0 : 0.0;

                goalsMap.put(gid, round1(dailyProgress.doubleValue()));
                totalsMap.put(gid, round1(cumulative.doubleValue()));
                targetsMap.put(gid, effectiveTarget.doubleValue());
                idealPathsMap.put(gid, round1(idealPct));
                cumulativeRawMap.put(gid, rActual.doubleValue());
                dailyRawMap.put(gid, dailyActual.doubleValue());
            }

            points.add(new ChartDataPoint(
                    date.toString(),
                    goalsMap,
                    totalsMap,
                    targetsMap,
                    idealPathsMap,
                    cumulativeRawMap,
                    dailyRawMap
            ));
        }

        return points;
    }

    private LocalDate calculateFromRange(String range, LocalDate endInterval) {
        if (range == null || "all".equalsIgnoreCase(range)) return null;
        return switch (range.toLowerCase()) {
            case "7d" -> endInterval.minusDays(6);
            case "30d" -> endInterval.minusDays(29);
            case "365d" -> endInterval.minusDays(364);
            case "week" -> startOfWeek(endInterval);
            case "year" -> endInterval.withDayOfYear(1);
            default -> null;
        };
    }

    private LocalDate startOfWeek(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    private LocalDate periodStartFor(LocalDate date, Period period) {
        return switch (period) {
            case DAY -> date;
            case WEEK, WORKWEEK -> startOfWeek(date);
            case WEEKEND -> date.with(DayOfWeek.SATURDAY);
            case MONTH -> date.withDayOfMonth(1);
            case YEAR -> date.withDayOfYear(1);
        };
    }

    private Period getEffectivePeriod(List<TargetHistory> histories, LocalDate date) {
        if (histories == null || histories.isEmpty()) {
            return Period.WEEK;
        }
        TargetHistory effective = null;
        for (TargetHistory h : histories) {
            if (!h.getValidFrom().isAfter(date)) {
                if (h.getValidTo() == null || !h.getValidTo().isBefore(date)) {
                    if (effective == null || h.getValidFrom().isAfter(effective.getValidFrom())) {
                        effective = h;
                    }
                }
            }
        }
        return effective != null ? effective.getPeriod() : Period.WEEK;
    }

    private BigDecimal getEffectiveTarget(List<TargetHistory> histories, LocalDate date) {
        if (histories == null || histories.isEmpty()) {
            return BigDecimal.ZERO;
        }
        TargetHistory effective = null;
        for (TargetHistory h : histories) {
            if (!h.getValidFrom().isAfter(date)) {
                if (h.getValidTo() == null || !h.getValidTo().isBefore(date)) {
                    if (effective == null || h.getValidFrom().isAfter(effective.getValidFrom())) {
                        effective = h;
                    }
                }
            }
        }
        return effective != null ? effective.getTargetValue() : BigDecimal.ZERO;
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
