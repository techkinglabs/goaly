package org.techkinglabs.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
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
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChartDataServiceTest {

    @Mock
    private DailyEntryRepository dailyEntryRepository;

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private TargetHistoryRepository targetHistoryRepository;

    @Mock
    private Clock clock;

    @InjectMocks
    private ChartDataService chartDataService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private DailyEntryChartView view(LocalDate date, double actual) {
        return new DailyEntryChartView(date, BigDecimal.valueOf(actual));
    }

    private Goal goal(Long id) {
        Goal g = new Goal();
        g.setId(id);
        g.setName("Goal " + id);
        g.setUnit("pages");
        return g;
    }

    private TargetHistory history(Long goalId, LocalDate from, BigDecimal target, Period period) {
        TargetHistory h = new TargetHistory();
        h.setGoalId(goalId);
        h.setValidFrom(from);
        h.setValidTo(null);
        h.setTargetValue(target);
        h.setPeriod(period);
        return h;
    }

    private TargetHistory historyWithTo(Long goalId, LocalDate from, LocalDate to, BigDecimal target, Period period) {
        TargetHistory h = new TargetHistory();
        h.setGoalId(goalId);
        h.setValidFrom(from);
        h.setValidTo(to);
        h.setTargetValue(target);
        h.setPeriod(period);
        return h;
    }

    private void mockClock(LocalDate fixed) {
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.instant()).thenReturn(fixed.atStartOfDay(ZoneId.of("UTC")).toInstant());
    }

    @Test
    void testWeeklyBucketsStartOnMonday() {
        LocalDate monday = LocalDate.of(2026, 1, 5);
        mockClock(monday);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, monday, monday))
                .thenReturn(List.of(
                        view(monday, 5)                      // Monday
                ));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2025, 12, 29), BigDecimal.valueOf(10), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(monday);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "week", monday);

        assertEquals(1, series.size());
        assertEquals(monday.toString(), series.getFirst().label());
        assertEquals(DayOfWeek.MONDAY, LocalDate.parse(series.getFirst().label()).getDayOfWeek());
    }

    @Test
    void testDailyRangeFiltersBoundaries() {
        LocalDate anchor = LocalDate.of(2026, 2, 10);
        mockClock(anchor);
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L)));
        LocalDate from = anchor.minusDays(6); // Feb 4
        List<DailyEntryChartView> views = new ArrayList<>();
        for (int d = 0; d <= 6; d++) {
            LocalDate date = from.plusDays(d);
            double actual = (date.equals(from) || date.equals(anchor)) ? 5.0 : 0.0;
            views.add(view(date, actual));
        }
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, from, anchor))
                .thenReturn(views);
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L))
                .thenReturn(List.of(history(1L, LocalDate.of(2026, 1, 1), BigDecimal.valueOf(10), Period.WEEK)));

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(goal(1L), "7d", anchor);

        assertEquals(7, series.size());
    }

    @Test
    void testCumulativePercentNotClippedAbove100() {
        LocalDate tuesday = LocalDate.of(2026, 3, 3);
        mockClock(tuesday);
        LocalDate firstEntryDate = LocalDate.of(2026, 3, 2);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, firstEntryDate, tuesday))
                .thenReturn(List.of(
                        view(LocalDate.of(2026, 3, 2), 6), // Monday
                        view(tuesday, 6)                     // Tuesday, same week
                ));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 2, 23), BigDecimal.valueOf(10), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(firstEntryDate);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", tuesday);

        assertFalse(series.isEmpty());
        double cumulative = series.getLast().totals().get(1L);
        assertEquals(120.0, cumulative, 0.0001);
    }

    @Test
    void testPerEntryPercentage() {
        LocalDate date = LocalDate.of(2026, 3, 1);
        mockClock(date);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, date, date))
                .thenReturn(List.of(view(date, 5)));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 2, 22), BigDecimal.valueOf(10), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(date);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", date);

        assertFalse(series.isEmpty());
        assertEquals(50.0, series.getLast().goals().get(1L), 0.0001);
    }

    @Test
    void testCumulativeTotalUsesPeriodTargetNotFixedGoalTarget() {
        LocalDate week1Mon = LocalDate.of(2026, 3, 2);   // Monday
        LocalDate week2Mon = week1Mon.plusWeeks(1);       // Monday
        Goal g = goal(1L);
        mockClock(week2Mon);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, week1Mon, week2Mon))
                .thenReturn(List.of(
                        view(week1Mon, 5),
                        view(week1Mon.plusDays(1), 0),
                        view(week1Mon.plusDays(2), 0),
                        view(week1Mon.plusDays(3), 0),
                        view(week1Mon.plusDays(4), 0),
                        view(week1Mon.plusDays(5), 0),
                        view(week1Mon.plusDays(6), 0),
                        view(week2Mon, 5)
                ));
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 2, 23), BigDecimal.valueOf(10), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(week1Mon);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", week2Mon);

        // "all" generates daily buckets from first entry (Mar 2) to anchor (Mar 9) = 8 days.
        assertEquals(8, series.size());
        // Week 1 target = 10 (one WEEK period). Entry of 5 → 50%.
        double week1Cumulative = series.get(0).totals().get(1L);
        assertEquals(50.0, week1Cumulative, 0.0001);
        // Week 1 + Week 2 = 20 target. Entries = 10. → 50%.
        double week2Cumulative = series.get(7).totals().get(1L);
        assertEquals(50.0, week2Cumulative, 0.0001);
    }

    @Test
    void testEmptyDataReturnsEmptySeries() {
        LocalDate anchor = LocalDate.of(2026, 3, 1);
        mockClock(anchor);
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, anchor, anchor))
                .thenReturn(List.of());
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of());

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "7d", anchor);

        assertEquals(0, series.size());
    }

    @Test
    void testChartDataPointContainsRawValues() {
        LocalDate date = LocalDate.of(2026, 3, 1);
        mockClock(date);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, date, date))
                .thenReturn(List.of(view(date, 5)));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 2, 22), BigDecimal.valueOf(10), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(date);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", date);

        assertFalse(series.isEmpty());
        ChartDataPoint point = series.getLast();
        assertEquals(5.0, point.dailyRaw().get(1L), 0.0001);
        assertEquals(5.0, point.cumulativeRaw().get(1L), 0.0001);
    }

    // --- Range boundary tests ---

    @Test
    void testThirtyDayRangeProducesThirtyPoints() {
        LocalDate anchor = LocalDate.of(2026, 3, 31);
        mockClock(anchor);
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L)));
        LocalDate from = anchor.minusDays(29); // exactly 30 days
        List<DailyEntryChartView> views = new ArrayList<>();
        for (int d = 0; d <= 29; d++) {
            LocalDate date = from.plusDays(d);
            views.add(view(date, d == 0 ? 5.0 : 0.0));
        }
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, from, anchor))
                .thenReturn(views);
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L))
                .thenReturn(List.of(history(1L, LocalDate.of(2026, 1, 1), BigDecimal.valueOf(10), Period.WEEK)));

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(goal(1L), "30d", anchor);

        assertEquals(30, series.size());
        assertEquals(from.toString(), series.getFirst().label());
        assertEquals(anchor.toString(), series.getLast().label());
    }

    @Test
    void testThreeHundredSixtyFiveDayRangeProduces365Points() {
        LocalDate anchor = LocalDate.of(2026, 3, 1);
        mockClock(anchor);
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L)));
        LocalDate from = anchor.minusDays(364); // exactly 365 days
        List<DailyEntryChartView> views = new ArrayList<>();
        for (int d = 0; d <= 364; d++) {
            views.add(view(from.plusDays(d), 0.0));
        }
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, from, anchor))
                .thenReturn(views);
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L))
                .thenReturn(List.of(history(1L, LocalDate.of(2025, 1, 1), BigDecimal.valueOf(10), Period.WEEK)));

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(goal(1L), "365d", anchor);

        assertEquals(365, series.size());
        assertEquals(from.toString(), series.getFirst().label());
        assertEquals(anchor.toString(), series.getLast().label());
    }

    @Test
    void testYearRangeStartsOnJanuary1() {
        LocalDate anchor = LocalDate.of(2026, 3, 15);
        mockClock(anchor);
        LocalDate from = LocalDate.of(2026, 1, 1);
        List<DailyEntryChartView> views = new ArrayList<>();
        for (int d = 0; d <= 74; d++) {
            views.add(view(from.plusDays(d), 0.0));
        }
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, from, anchor))
                .thenReturn(views);
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L)));
        when(targetHistoryRepository.findByGoalIdInOrderByGoalIdAscValidFromAsc(List.of(1L)))
                .thenReturn(List.of(history(1L, LocalDate.of(2025, 12, 29), BigDecimal.valueOf(70), Period.WEEK)));

        List<ChartDataPoint> series = chartDataService.getChartDataForAllGoals("year", anchor);

        assertEquals(75, series.size()); // Jan 1 to Mar 15 = 75 days
        assertEquals(LocalDate.of(2026, 1, 1).toString(), series.getFirst().label());
    }

    // --- All range with different first entry dates ---

    @Test
    void testAllRangeWithDifferentFirstEntryDates() {
        LocalDate anchor = LocalDate.of(2026, 3, 10);
        mockClock(anchor);

        // Goal 1 has entries starting Mar 5, Goal 2 starting Mar 8
        LocalDate goal1From = LocalDate.of(2026, 3, 5);
        LocalDate goal2From = LocalDate.of(2026, 3, 8);

        // SQL generate_series fills all dates in range with zero for missing entries
        List<DailyEntryChartView> views1 = new ArrayList<>();
        views1.add(view(goal1From, 10));       // Mar 5
        views1.add(view(goal1From.plusDays(1), 10));  // Mar 6
        views1.add(view(goal1From.plusDays(2), 10));  // Mar 7
        views1.add(view(goal1From.plusDays(3), 10));  // Mar 8
        views1.add(view(goal1From.plusDays(4), 10));  // Mar 9
        views1.add(view(goal1From.plusDays(5), 0));     // Mar 10

        List<DailyEntryChartView> views2 = new ArrayList<>();
        views2.add(view(goal1From, 0));                     // Mar 5 (zero - before goal 2's first entry)
        views2.add(view(goal1From.plusDays(1), 0));         // Mar 6
        views2.add(view(goal1From.plusDays(2), 0));         // Mar 7
        views2.add(view(goal2From, 10));                     // Mar 8
        views2.add(view(goal2From.plusDays(1), 10));        // Mar 9
        views2.add(view(goal2From.plusDays(2), 0));          // Mar 10

        when(goalRepository.findAll()).thenReturn(List.of(goal(1L), goal(2L)));
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, goal1From, anchor))
                .thenReturn(views1);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(2L, goal1From, anchor))
                .thenReturn(views2);
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(goal1From);
        when(dailyEntryRepository.findMinEntryDateByGoalId(2L)).thenReturn(goal2From);
        when(targetHistoryRepository.findByGoalIdInOrderByGoalIdAscValidFromAsc(List.of(1L, 2L)))
                .thenReturn(List.of(
                        history(1L, LocalDate.of(2026, 1, 1), BigDecimal.valueOf(10), Period.WEEK),
                        history(2L, LocalDate.of(2026, 1, 1), BigDecimal.valueOf(10), Period.WEEK)
                ));

        List<ChartDataPoint> series = chartDataService.getChartDataForAllGoals("all", anchor);

        // "all" range: from earliest entry (Mar 5) to anchor (Mar 10) = 6 days
        assertEquals(6, series.size());
        assertEquals(goal1From.toString(), series.getFirst().label());
        // First point: goal 1 has 10, goal 2 has 0 (from generate_series)
        assertEquals(100.0, series.getFirst().goals().get(1L), 0.0001);
        assertEquals(0.0, series.getFirst().goals().get(2L), 0.0001);
    }

    // --- Combined chart tests ---

    @Test
    void testCombinedChartMultipleGoalsOnePointPerDate() {
        LocalDate anchor = LocalDate.of(2026, 3, 3);
        mockClock(anchor);
        LocalDate from = LocalDate.of(2026, 3, 1);

        Goal goal1 = goal(1L);
        Goal goal2 = goal(2L);

        // SQL generate_series fills all dates for each goal
        List<DailyEntryChartView> views1 = List.of(
                view(from, 5), view(from.plusDays(1), 0), view(from.plusDays(2), 5)
        );
        List<DailyEntryChartView> views2 = List.of(
                view(from, 10), view(from.plusDays(1), 10), view(from.plusDays(2), 0)
        );

        when(goalRepository.findAll()).thenReturn(List.of(goal1, goal2));
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, from, anchor))
                .thenReturn(views1);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(2L, from, anchor))
                .thenReturn(views2);
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(from);
        when(dailyEntryRepository.findMinEntryDateByGoalId(2L)).thenReturn(from);
        when(targetHistoryRepository.findByGoalIdInOrderByGoalIdAscValidFromAsc(List.of(1L, 2L)))
                .thenReturn(List.of(
                        history(1L, LocalDate.of(2026, 2, 22), BigDecimal.valueOf(10), Period.WEEK),
                        history(2L, LocalDate.of(2026, 2, 22), BigDecimal.valueOf(10), Period.WEEK)
                ));

        List<ChartDataPoint> series = chartDataService.getChartDataForAllGoals("all", anchor);

        // 3 dates: Mar 1, Mar 2, Mar 3
        assertEquals(3, series.size());
        assertEquals(from.toString(), series.get(0).label());
        assertEquals(from.plusDays(1).toString(), series.get(1).label());
        assertEquals(from.plusDays(2).toString(), series.get(2).label());
    }

    @Test
    void testCombinedChartMapsContainCorrectGoalIds() {
        LocalDate anchor = LocalDate.of(2026, 3, 2);
        mockClock(anchor);
        LocalDate from = LocalDate.of(2026, 3, 1);

        Goal goal1 = goal(1L);
        Goal goal2 = goal(2L);

        List<DailyEntryChartView> views1 = List.of(
                view(from, 5), view(from.plusDays(1), 5)
        );
        List<DailyEntryChartView> views2 = List.of(
                view(from, 10), view(from.plusDays(1), 0)
        );

        when(goalRepository.findAll()).thenReturn(List.of(goal1, goal2));
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, from, anchor))
                .thenReturn(views1);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(2L, from, anchor))
                .thenReturn(views2);
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(from);
        when(dailyEntryRepository.findMinEntryDateByGoalId(2L)).thenReturn(from);
        when(targetHistoryRepository.findByGoalIdInOrderByGoalIdAscValidFromAsc(List.of(1L, 2L)))
                .thenReturn(List.of(
                        history(1L, LocalDate.of(2026, 2, 22), BigDecimal.valueOf(10), Period.WEEK),
                        history(2L, LocalDate.of(2026, 2, 22), BigDecimal.valueOf(20), Period.WEEK)
                ));

        List<ChartDataPoint> series = chartDataService.getChartDataForAllGoals("all", anchor);

        assertFalse(series.isEmpty());
        ChartDataPoint point = series.getFirst();
        assertTrue(point.goals().containsKey(1L));
        assertTrue(point.goals().containsKey(2L));
        assertTrue(point.totals().containsKey(1L));
        assertTrue(point.totals().containsKey(2L));
        assertTrue(point.targets().containsKey(1L));
        assertTrue(point.targets().containsKey(2L));
        assertTrue(point.idealPaths().containsKey(1L));
        assertTrue(point.idealPaths().containsKey(2L));
        assertTrue(point.cumulativeRaw().containsKey(1L));
        assertTrue(point.cumulativeRaw().containsKey(2L));
        assertTrue(point.dailyRaw().containsKey(1L));
        assertTrue(point.dailyRaw().containsKey(2L));
    }

    // --- Target change mid-period ---

    @Test
    void testTargetChangeMidPeriod() {
        LocalDate mon = LocalDate.of(2026, 3, 2);   // Monday
        LocalDate wed = mon.plusDays(2);             // Wednesday
        localStorageChangeMidPeriod(mon, wed);
    }

    void localStorageChangeMidPeriod(LocalDate mon, LocalDate wed) {
        mockClock(wed);
        // Target changes from 10 to 20 on Tuesday (mid-week)
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, mon, wed))
                .thenReturn(List.of(
                        view(mon, 5),    // Monday, target=10
                        view(mon.plusDays(1), 0), // Tuesday, target now 20
                        view(wed, 5)     // Wednesday, target=20
                ));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 2, 23), BigDecimal.valueOf(10), Period.WEEK),
                history(1L, LocalDate.of(2026, 3, 3), BigDecimal.valueOf(20), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(mon);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", wed);

        assertFalse(series.isEmpty());
        // Monday: dailyActual=5, effectiveTarget=10 → 50%
        assertEquals(50.0, series.get(0).goals().get(1L), 0.0001);
        // Wednesday: dailyActual=5, effectiveTarget=20 → 25%
        assertEquals(25.0, series.get(2).goals().get(1L), 0.0001);
        // Target field should reflect the effective target per date
        assertEquals(10.0, series.get(0).targets().get(1L), 0.0001);
        assertEquals(20.0, series.get(2).targets().get(1L), 0.0001);
    }

    // --- Period change in history ---

    @Test
    void testPeriodChangeInHistory() {
        LocalDate date1 = LocalDate.of(2026, 3, 1);
        LocalDate date2 = LocalDate.of(2026, 3, 8);
        LocalDate date3 = LocalDate.of(2026, 3, 15);
        mockClock(date3);

        // History: WEEK target=14 (effective Mar 1-7), DAY target=3 (effective Mar 8+)
        // WEEK: daily progress = actual / 14 * 100
        // DAY: daily progress = actual / 3 * 100
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, date1, date3))
                .thenReturn(List.of(
                        view(date1, 7),   // Week target=14 → 7/14 = 50%
                        view(date2, 2),    // Day target=3 → 2/3 = 66.7%
                        view(date3, 3)     // Day target=3 → 3/3 = 100%
                ));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 2, 23), BigDecimal.valueOf(14), Period.WEEK),
                history(1L, LocalDate.of(2026, 3, 3), BigDecimal.valueOf(3), Period.DAY)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(date1);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", date3);

        assertFalse(series.isEmpty());
        // date1: WEEK, target=14, actual=7 → 50%
        assertEquals(14.0, series.get(0).targets().get(1L), 0.0001);
        assertEquals(50.0, series.get(0).goals().get(1L), 0.0001);
        // date2: DAY, target=3, actual=2 → 66.7%
        assertEquals(3.0, series.get(1).targets().get(1L), 0.0001);
        assertEquals(66.7, series.get(1).goals().get(1L), 0.01);
        // date3: DAY, target=3, actual=3 → 100%
        assertEquals(3.0, series.get(2).targets().get(1L), 0.0001);
        assertEquals(100.0, series.get(2).goals().get(1L), 0.0001);
    }

    // --- validFrom/validTo boundaries ---

    @Test
    void testValidToBoundaryRespectsHistory() {
        LocalDate mon = LocalDate.of(2026, 3, 2);
        LocalDate tue = mon.plusDays(1);
        LocalDate wed = mon.plusDays(2);
        mockClock(wed);

        // History with validTo: target=10 validMon-Tue, then period changes
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, mon, wed))
                .thenReturn(List.of(
                        view(mon, 10),  // target=10 → 100%
                        view(tue, 10),  // target=10 → 100%
                        view(wed, 5)    // target=5 (new period) → 100%
                ));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                historyWithTo(1L, LocalDate.of(2026, 2, 23), LocalDate.of(2026, 3, 2), BigDecimal.valueOf(10), Period.WEEK),
                historyWithTo(1L, LocalDate.of(2026, 3, 3), null, BigDecimal.valueOf(5), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(mon);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", wed);

        // Mar 2 (Mon): target=10 (validTo=Mar 2, inclusive) → 10/10 = 100%
        assertEquals(10.0, series.get(0).targets().get(1L), 0.0001);
        assertEquals(100.0, series.get(0).goals().get(1L), 0.0001);
        // Mar 3 (Wed): target=5 (new entry, validFrom=Mar 3) → 5/5 = 100%
        assertEquals(5.0, series.get(2).targets().get(1L), 0.0001);
        assertEquals(100.0, series.get(2).goals().get(1L), 0.0001);
    }

    // --- Missing days and zero values ---

    @Test
    void testMissingDaysFilledWithZero() {
        LocalDate mon = LocalDate.of(2026, 4, 6);
        LocalDate wed = mon.plusDays(2);
        mockClock(wed);

        // SQL generate_series fills in Tuesday with 0
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, mon, wed))
                .thenReturn(List.of(
                        view(mon, 5),
                        view(mon.plusDays(1), 0),  // Tuesday (zero from SQL)
                        view(wed, 5)
                ));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 4, 6), BigDecimal.valueOf(10), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(mon);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", wed);

        assertEquals(3, series.size());
        // Tuesday has zero daily value
        assertEquals(0.0, series.get(1).dailyRaw().get(1L), 0.0001);
        assertEquals(0.0, series.get(1).goals().get(1L), 0.0001);
        // Cumulative should still be 50% (5 out of 10)
        assertEquals(50.0, series.get(1).totals().get(1L), 0.0001);
    }

    // --- Empty goals list and goal without entries ---

    @Test
    void testEmptyGoalListReturnsEmpty() {
        LocalDate anchor = LocalDate.of(2026, 3, 1);
        mockClock(anchor);
        when(goalRepository.findAll()).thenReturn(List.of());

        List<ChartDataPoint> series = chartDataService.getChartDataForAllGoals("all", anchor);

        assertEquals(0, series.size());
    }

    @Test
    void testGoalWithoutEntriesAfterRangeCalculation() {
        LocalDate anchor = LocalDate.of(2026, 3, 1);
        mockClock(anchor);
        LocalDate from = anchor.minusDays(6);
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L)));
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, from, anchor))
                .thenReturn(List.of());
        when(targetHistoryRepository.findByGoalIdInOrderByGoalIdAscValidFromAsc(List.of(1L)))
                .thenReturn(List.of());

        List<ChartDataPoint> series = chartDataService.getChartDataForAllGoals("7d", anchor);

        assertEquals(0, series.size());
    }

    // --- Zero target, progress over 100%, progress decline ---

    @Test
    void testProgressOver100NotClippedForNonWeekRange() {
        // "all" range should NOT clip cumulative above 100%
        LocalDate date = LocalDate.of(2026, 3, 1);
        mockClock(date);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, date, date))
                .thenReturn(List.of(view(date, 15)));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 2, 22), BigDecimal.valueOf(10), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(date);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", date);

        assertFalse(series.isEmpty());
        // 15/10 = 150%
        assertEquals(150.0, series.getLast().goals().get(1L), 0.0001);
        assertEquals(150.0, series.getLast().totals().get(1L), 0.0001);
    }

    @Test
    void testProgressDeclineForNonWeekRange() {
        // "all" range should allow legitimate decline (no clamp)
        LocalDate date1 = LocalDate.of(2026, 3, 1);
        LocalDate date2 = LocalDate.of(2026, 3, 8);
        LocalDate date3 = LocalDate.of(2026, 3, 15);
        mockClock(date3);

        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, date1, date3))
                .thenReturn(List.of(
                        view(date1, 10),  // 10/10 = 100%
                        view(date2, 0),    // 0/10 (same period, but 0 for this day); cumulative = 10/20 = 50%
                        view(date3, 0)     // 0/10 (next period); cumulative = 10/30 = 33.3%
                ));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 2, 23), BigDecimal.valueOf(10), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(date1);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", date3);

        assertEquals(3, series.size());
        // Week 1: cumulative = 10/10 = 100%
        assertEquals(100.0, series.get(0).totals().get(1L), 0.0001);
        // Week 2 starts: cumulative = 10/20 = 50% (legitimate decline, not clamped since "all" range)
        assertEquals(50.0, series.get(1).totals().get(1L), 0.0001);
        // Week 3: cumulative = 10/30 = 33.3%
        assertEquals(33.3, series.get(2).totals().get(1L), 0.01);
    }

    @Test
    void testZeroTargetProducesZeroPercentages() {
        LocalDate date = LocalDate.of(2026, 3, 1);
        mockClock(date);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, date, date))
                .thenReturn(List.of(view(date, 5)));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 1, 1), BigDecimal.ZERO, Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(date);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", date);

        assertFalse(series.isEmpty());
        assertEquals(0.0, series.getLast().goals().get(1L), 0.0001);
        assertEquals(0.0, series.getLast().totals().get(1L), 0.0001);
        assertEquals(0.0, series.getLast().targets().get(1L), 0.0001);
    }

    @Test
    void testEmptyTargetHistoryFallbackToZero() {
        LocalDate date = LocalDate.of(2026, 3, 1);
        mockClock(date);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, date, date))
                .thenReturn(List.of(view(date, 5)));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of());
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(date);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", date);

        assertFalse(series.isEmpty());
        assertEquals(0.0, series.getLast().goals().get(1L), 0.0001);
        assertEquals(5.0, series.getLast().dailyRaw().get(1L), 0.0001);
        assertEquals(5.0, series.getLast().cumulativeRaw().get(1L), 0.0001);
    }

    // --- Null anchor, unknown range ---

    @Test
    void testNullAnchorDefaultsToToday() {
        LocalDate today = LocalDate.of(2026, 3, 10);
        mockClock(today);
        LocalDate from = today.minusDays(6); // 7d
        List<DailyEntryChartView> views = new ArrayList<>();
        for (int d = 0; d <= 6; d++) {
            views.add(view(from.plusDays(d), 0.0));
        }
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L)));
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, from, today))
                .thenReturn(views);
        when(targetHistoryRepository.findByGoalIdInOrderByGoalIdAscValidFromAsc(List.of(1L)))
                .thenReturn(List.of());

        List<ChartDataPoint> series = chartDataService.getChartDataForAllGoals("7d", null);

        assertEquals(7, series.size());
        assertEquals(from.toString(), series.getFirst().label());
        assertEquals(today.toString(), series.getLast().label());
    }

    @Test
    void testUnknownRangeTreatedAsAll() {
        LocalDate today = LocalDate.of(2026, 3, 10);
        mockClock(today);
        LocalDate earliest = LocalDate.of(2026, 3, 1);
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L)));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(earliest);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, earliest, today))
                .thenReturn(List.of(view(earliest, 5)));
        when(targetHistoryRepository.findByGoalIdInOrderByGoalIdAscValidFromAsc(List.of(1L)))
                .thenReturn(List.of());

        List<ChartDataPoint> series = chartDataService.getChartDataForAllGoals("unknown", today);

        // "unknown" range → from = null → treated as "all" → uses earliest entry date
        assertFalse(series.isEmpty());
    }

    // --- Ideal path test ---

    @Test
    void testIdealPathLinearInterpolation() {
        LocalDate date1 = LocalDate.of(2026, 3, 1);
        LocalDate date3 = LocalDate.of(2026, 3, 3);
        mockClock(date3);
        when(dailyEntryRepository.findChartDataByGoalIdAndDateBetween(1L, date1, date3))
                .thenReturn(List.of(
                        view(date1, 0),
                        view(date1.plusDays(1), 0),
                        view(date3, 0)
                ));
        Goal g = goal(1L);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(1L)).thenReturn(List.of(
                history(1L, LocalDate.of(2026, 2, 22), BigDecimal.valueOf(10), Period.WEEK)
        ));
        when(dailyEntryRepository.findMinEntryDateByGoalId(1L)).thenReturn(date1);

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", date3);

        assertEquals(3, series.size());
        // Linear: 0, 50, 100
        assertEquals(0.0, series.get(0).idealPaths().get(1L), 0.0001);
        assertEquals(50.0, series.get(1).idealPaths().get(1L), 0.0001);
        assertEquals(100.0, series.get(2).idealPaths().get(1L), 0.0001);
    }
}
