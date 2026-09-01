package org.techkinglabs.service;

import org.techkinglabs.dto.ChartDataPoint;
import org.techkinglabs.entity.DailyEntry;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.entity.TargetHistory;
import org.techkinglabs.model.Period;
import org.techkinglabs.repository.GoalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChartDataServiceTest {

    @Mock
    private DailyEntryService dailyEntryService;

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private GoalService goalService;

    @Mock
    private Clock clock;

    @InjectMocks
    private ChartDataService chartDataService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private DailyEntry entry(Long id, LocalDate date, double actual) {
        DailyEntry e = new DailyEntry();
        e.setId(id);
        e.setGoalId(1L);
        e.setEntryDate(date);
        e.setActualValue(BigDecimal.valueOf(actual));
        e.setTargetValue(BigDecimal.valueOf(10));
        return e;
    }

    private Goal goal() {
        Goal g = new Goal();
        g.setId(1L);
        g.setTargetValue(BigDecimal.valueOf(10));
        g.setPeriod(Period.WEEK);
        return g;
    }

    private TargetHistory history(LocalDate from) {
        TargetHistory h = new TargetHistory();
        h.setGoalId(1L);
        h.setValidFrom(from);
        h.setValue(BigDecimal.valueOf(10));
        h.setPeriod(Period.WEEK);
        return h;
    }

    @Test
    void testWeeklyBucketsStartOnMonday() {
        LocalDate monday = LocalDate.of(2026, 1, 5);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.instant()).thenReturn(monday.atStartOfDay(ZoneId.of("UTC")).toInstant());
        when(dailyEntryService.getEntriesByGoalId(1L)).thenReturn(List.of(
                entry(1L, LocalDate.of(2026, 1, 1), 5),  // Thursday
                entry(2L, monday, 5)   // Monday
        ));
        Goal g = goal();
        when(goalService.getTargetHistoryByGoalIds(List.of(1L))).thenReturn(Map.of(1L, List.of(
                history(LocalDate.of(2025, 12, 29))
        )));

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "week", monday);

        assertEquals(1, series.size());
        assertEquals(monday.toString(), series.getFirst().label());
        assertEquals(DayOfWeek.MONDAY, LocalDate.parse(series.getFirst().label()).getDayOfWeek());
    }

    @Test
    void testDailyRangeFiltersBoundaries() {
        LocalDate anchor = LocalDate.of(2026, 2, 10);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.instant()).thenReturn(anchor.atStartOfDay(ZoneId.of("UTC")).toInstant());
        when(dailyEntryService.getEntriesFrom(anchor.minusDays(6))).thenReturn(List.of(
                entry(2L, anchor.minusDays(6), 5),   // boundary inclusive
                entry(3L, anchor, 5)                  // boundary inclusive
        ));
        when(goalRepository.findAll()).thenReturn(List.of(goal()));
        when(goalService.getTargetHistoryByGoalIds(List.of(1L))).thenReturn(Map.of(1L, List.of(
                history(LocalDate.of(2026, 1, 1))
        )));

        List<ChartDataPoint> series = chartDataService.getChartDataForAllGoals("7d", anchor);

        assertEquals(7, series.size());
    }

    @Test
    void testCumulativePercentNotClippedAbove100() {
        LocalDate tuesday = LocalDate.of(2026, 3, 3);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.instant()).thenReturn(tuesday.atStartOfDay(ZoneId.of("UTC")).toInstant());
        when(dailyEntryService.getEntriesByGoalId(1L)).thenReturn(List.of(
                entry(1L, LocalDate.of(2026, 3, 2), 6), // Monday
                entry(2L, tuesday, 6)  // Tuesday, same week
        ));
        Goal g = goal();
        when(goalService.getTargetHistoryByGoalIds(List.of(1L))).thenReturn(Map.of(1L, List.of(
                history(LocalDate.of(2026, 2, 23))
        )));

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", tuesday);

        double cumulative = series.getLast().totals().get(1L);
        assertEquals(120.0, cumulative, 0.0001);
    }

    @Test
    void testPerEntryPercentage() {
        LocalDate date = LocalDate.of(2026, 3, 1);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.instant()).thenReturn(date.atStartOfDay(ZoneId.of("UTC")).toInstant());
        when(dailyEntryService.getEntriesByGoalId(1L)).thenReturn(List.of(
                entry(1L, date, 5)
        ));
        Goal g = goal();
        when(goalService.getTargetHistoryByGoalIds(List.of(1L))).thenReturn(Map.of(1L, List.of(
                history(LocalDate.of(2026, 2, 22))
        )));

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", date);

        assertEquals(50.0, series.getFirst().goals().get(1L), 0.0001);
    }

    @Test
    void testCumulativeTotalUsesPeriodTargetNotFixedGoalTarget() {
        LocalDate week1Mon = LocalDate.of(2026, 3, 2);   // Monday
        LocalDate week2Mon = week1Mon.plusWeeks(1);       // Monday
        Goal g = goal();
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.instant()).thenReturn(week2Mon.atStartOfDay(ZoneId.of("UTC")).toInstant());
        when(dailyEntryService.getEntriesByGoalId(1L)).thenReturn(List.of(
                entry(1L, week1Mon, 5),
                entry(2L, week2Mon, 5)
        ));
        when(goalService.getTargetHistoryByGoalIds(List.of(1L))).thenReturn(Map.of(1L, List.of(
                history(LocalDate.of(2026, 2, 23))
        )));

        List<ChartDataPoint> series = chartDataService.getChartDataForGoal(g, "all", week2Mon);

        assertEquals(2, series.size());
        assertEquals(50.0, series.get(0).totals().get(1L), 0.0001);
        assertEquals(50.0, series.get(1).totals().get(1L), 0.0001);
    }
}
