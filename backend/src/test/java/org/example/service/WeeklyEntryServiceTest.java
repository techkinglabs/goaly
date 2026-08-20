package org.example.service;

import org.example.entity.WeeklyEntry;
import org.example.repository.WeeklyEntryRepository;
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

class WeeklyEntryServiceTest {

    @Mock
    private WeeklyEntryRepository weeklyEntryRepository;

    @Mock
    private GoalRepository goalRepository;

    @InjectMocks
    private WeeklyEntryService weeklyEntryService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testGetEntriesByGoalId() {
        // Given
        Long goalId = 1L;
        List<WeeklyEntry> entries = Arrays.asList(
            new WeeklyEntry(),
            new WeeklyEntry()
        );

        when(weeklyEntryRepository.findByGoalIdOrderByWeekStartDate(goalId)).thenReturn(entries);

        // When
        List<WeeklyEntry> result = weeklyEntryService.getEntriesByGoalId(goalId);

        // Then
        assertEquals(entries, result);
        verify(weeklyEntryRepository).findByGoalIdOrderByWeekStartDate(goalId);
    }

    @Test
    void testCreateWeeklyEntry() {
        // Given
        WeeklyEntry entry = new WeeklyEntry();
        entry.setGoalId(1L);
        entry.setWeekStartDate(LocalDate.now());
        entry.setActualValue(new BigDecimal("5"));
        entry.setTargetValue(new BigDecimal("8"));

        when(goalRepository.findById(entry.getGoalId())).thenReturn(Optional.of(mock(org.example.entity.Goal.class)));
        when(weeklyEntryRepository.save(entry)).thenReturn(entry);

        // When
        WeeklyEntry result = weeklyEntryService.createWeeklyEntry(entry);

        // Then
        assertEquals(entry, result);
        verify(goalRepository).findById(entry.getGoalId());
        verify(weeklyEntryRepository).save(entry);
    }
}