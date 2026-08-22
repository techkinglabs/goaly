package org.example.service;

import org.example.entity.DailyEntry;
import org.example.entity.Goal;
import org.example.repository.DailyEntryRepository;
import org.example.repository.GoalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import java.math.BigDecimal;
import java.time.LocalDate;
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

    @InjectMocks
    private DailyEntryService dailyEntryService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
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
        entry.setEntryDate(LocalDate.now());
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
}
