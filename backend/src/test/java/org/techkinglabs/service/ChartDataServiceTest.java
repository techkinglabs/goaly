package org.techkinglabs.service;

import org.techkinglabs.entity.DailyEntry;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.repository.GoalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
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

    @InjectMocks
    private ChartDataService chartDataService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private DailyEntry entry(Long id, Long goalId, LocalDate date, double actual, double target) {
        DailyEntry e = new DailyEntry();
        e.setId(id);
        e.setGoalId(goalId);
        e.setEntryDate(date);
        e.setActualValue(new BigDecimal(String.valueOf(actual)));
        e.setTargetValue(new BigDecimal(String.valueOf(target)));
        return e;
    }

    private Goal goal(Long id, double target) {
        Goal g = new Goal();
        g.setId(id);
        g.setTargetValue(new BigDecimal(String.valueOf(target)));
        return g;
    }

    @Test
    void testWeeklyBucketsStartOnMonday() {
        when(dailyEntryService.getEntriesByGoalId(1L)).thenReturn(List.of(
                entry(1L, 1L, LocalDate.of(2026, 1, 1), 5, 10),  // Thursday
                entry(2L, 1L, LocalDate.of(2026, 1, 5), 5, 10)   // Monday
        ));
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L, 10)));
        when(goalService.getEffectiveTarget(1L, LocalDate.of(2026, 1, 1))).thenReturn(new BigDecimal("10"));
        when(goalService.getEffectiveTarget(1L, LocalDate.of(2026, 1, 5))).thenReturn(new BigDecimal("10"));

        List<Map<String, Object>> series = chartDataService.getChartDataForGoal(1L, "week", LocalDate.of(2026, 1, 5));

        assertEquals(1, series.size());
        LocalDate weekStart = LocalDate.of(2026, 1, 5); // Monday
        assertEquals(weekStart.toString(), series.get(0).get("weekStart"));
        assertEquals(DayOfWeek.MONDAY, LocalDate.parse((String) series.get(0).get("weekStart")).getDayOfWeek());
    }

    @Test
    void testDailyRangeFiltersBoundaries() {
        LocalDate anchor = LocalDate.of(2026, 2, 10);
        when(dailyEntryService.getAllEntries()).thenReturn(List.of(
                entry(1L, 1L, anchor.minusDays(7), 5, 10),   // outside (7d => from anchor-6)
                entry(2L, 1L, anchor.minusDays(6), 5, 10),   // boundary inclusive
                entry(3L, 1L, anchor, 5, 10)                  // boundary inclusive
        ));
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L, 10)));
        when(goalService.getEffectiveTarget(anyLong(), any())).thenReturn(new BigDecimal("10"));

        List<Map<String, Object>> series = chartDataService.getChartDataForAllGoals("7d", anchor);

        // Every day in the window is pre-filled (anchor-6 .. anchor = 7 days),
        // so the cumulative line is continuous even when some days have no entry.
        assertEquals(7, series.size());
    }

    @Test
    void testCumulativePercentNotClippedAbove100() {
        when(dailyEntryService.getEntriesByGoalId(1L)).thenReturn(List.of(
                entry(1L, 1L, LocalDate.of(2026, 3, 2), 6, 10), // Monday
                entry(2L, 1L, LocalDate.of(2026, 3, 3), 6, 10)  // Tuesday, same week
        ));
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L, 10)));
        when(goalService.getEffectiveTarget(anyLong(), any())).thenReturn(new BigDecimal("10"));

        // Both entries fall in one week, so the cumulative denominator is a single
        // weekly target (10); 12 done vs 10 target = 120% (not clipped at 100%).
        List<Map<String, Object>> series = chartDataService.getChartDataForGoal(1L, "all", LocalDate.of(2026, 3, 3));

        Object last = series.get(series.size() - 1).get("total_1");
        assertTrue(last instanceof Number);
        double cumulative = ((Number) last).doubleValue();
        assertEquals(120.0, cumulative, 0.0001);
    }

    @Test
    void testPerEntryPercentage() {
        when(dailyEntryService.getEntriesByGoalId(1L)).thenReturn(List.of(
                entry(1L, 1L, LocalDate.of(2026, 3, 1), 5, 10)
        ));
        when(goalRepository.findAll()).thenReturn(List.of(goal(1L, 10)));
        when(goalService.getEffectiveTarget(anyLong(), any())).thenReturn(new BigDecimal("10"));

        List<Map<String, Object>> series = chartDataService.getChartDataForGoal(1L, "all", LocalDate.of(2026, 3, 1));

        assertEquals(50.0, ((Number) series.get(0).get("goal_1")).doubleValue(), 0.0001);
    }
}
