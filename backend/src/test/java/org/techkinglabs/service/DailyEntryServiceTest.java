package org.techkinglabs.service;

import org.techkinglabs.entity.DailyEntry;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.repository.DailyEntryRepository;
import org.techkinglabs.repository.GoalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DailyEntryServiceTest {

    @Mock
    private DailyEntryRepository dailyEntryRepository;

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private GoalService goalService;

    @Mock
    private Clock clock;

    @InjectMocks
    private DailyEntryService dailyEntryService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.instant()).thenReturn(Instant.parse("2026-01-01T00:00:00Z"));
    }

    @Test
    void testGetEntriesByGoalId() {
        Long goalId = 1L;
        List<DailyEntry> entries = Arrays.asList(
            new DailyEntry(),
            new DailyEntry()
        );

        when(dailyEntryRepository.findByGoalIdOrderByEntryDate(goalId)).thenReturn(entries);

        List<DailyEntry> result = dailyEntryService.getEntriesByGoalId(goalId);

        assertEquals(entries, result);
        verify(dailyEntryRepository).findByGoalIdOrderByEntryDate(goalId);
    }

    @Test
    void testCreateDailyEntrySnapshotsEffectiveTarget() {
        DailyEntry entry = new DailyEntry();
        entry.setGoalId(1L);
        entry.setEntryDate(LocalDate.of(2026, 1, 1));
        entry.setActualValue(new BigDecimal("5"));
        entry.setTargetValue(new BigDecimal("8"));

        Goal goal = mock(Goal.class);
        when(goalRepository.findById(entry.getGoalId())).thenReturn(Optional.of(goal));
        when(goalService.getEffectiveTarget(entry.getGoalId(), entry.getEntryDate())).thenReturn(new BigDecimal("12"));
        when(dailyEntryRepository.save(entry)).thenReturn(entry);

        DailyEntry result = dailyEntryService.createDailyEntry(entry);

        assertEquals(new BigDecimal("12"), result.getTargetValue());
        verify(goalRepository).findById(entry.getGoalId());
        verify(goalService).getEffectiveTarget(entry.getGoalId(), entry.getEntryDate());
        verify(dailyEntryRepository).save(entry);
    }

    @Test
    void testUpdateDailyEntryAllowsSameDateForDifferentEntry() {
        DailyEntry existing = new DailyEntry();
        existing.setId(1L);
        existing.setGoalId(1L);
        existing.setEntryDate(LocalDate.of(2026, 1, 1));

        DailyEntry moved = new DailyEntry();
        moved.setId(2L);
        moved.setGoalId(1L);
        moved.setEntryDate(LocalDate.of(2026, 1, 1));

        Goal goal = mock(Goal.class);
        when(goalRepository.findById(moved.getGoalId())).thenReturn(Optional.of(goal));
        when(goalService.getEffectiveTarget(moved.getGoalId(), moved.getEntryDate())).thenReturn(new BigDecimal("9"));
        when(dailyEntryRepository.save(moved)).thenReturn(moved);

        DailyEntry result = dailyEntryService.updateDailyEntryInDb(moved);

        assertEquals(new BigDecimal("9"), result.getTargetValue());
        verify(dailyEntryRepository).save(moved);
    }

    @Test
    void testUpdateDailyEntryAllowsSameDateForSameId() {
        DailyEntry entry = new DailyEntry();
        entry.setId(5L);
        entry.setGoalId(1L);
        entry.setEntryDate(LocalDate.of(2026, 1, 1));

        Goal goal = mock(Goal.class);
        when(goalRepository.findById(entry.getGoalId())).thenReturn(Optional.of(goal));
        when(goalService.getEffectiveTarget(entry.getGoalId(), entry.getEntryDate())).thenReturn(new BigDecimal("9"));
        when(dailyEntryRepository.save(entry)).thenReturn(entry);

        DailyEntry result = dailyEntryService.updateDailyEntryInDb(entry);

        assertEquals(new BigDecimal("9"), result.getTargetValue());
        verify(dailyEntryRepository).save(entry);
    }
}
