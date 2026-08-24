package org.techkinglabs.service;

import org.techkinglabs.entity.Goal;
import org.techkinglabs.entity.TargetHistory;
import org.techkinglabs.repository.GoalRepository;
import org.techkinglabs.repository.TargetHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GoalServiceTest {

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private TargetHistoryRepository targetHistoryRepository;

    @InjectMocks
    private GoalService goalService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCreateGoal() {
        // Given
        Goal goal = new Goal();
        goal.setName("Sleep at 23:00");
        goal.setUnit("hours");
        goal.setTargetValue(new BigDecimal("8"));
        goal.setAmountPerPeriod(new BigDecimal("8"));

        when(goalRepository.save(goal)).thenReturn(goal);

        // When
        Goal result = goalService.createGoal(goal);

        // Then
        assertEquals(goal, result);
        verify(goalRepository, times(2)).save(goal);
        verify(targetHistoryRepository).save(argThat(h -> h.getValue().compareTo(new BigDecimal("8")) == 0));
    }

    @Test
    void testGetGoalById() {
        // Given
        Long id = 1L;
        Goal goal = new Goal();
        goal.setId(id);
        goal.setName("Sleep at 23:00");

        when(goalRepository.findById(id)).thenReturn(Optional.of(goal));

        // When
        Optional<Goal> result = goalService.getGoalById(id);

        // Then
        assertTrue(result.isPresent());
        assertEquals(goal, result.get());
        verify(goalRepository).findById(id);
    }

    @Test
    void testToWeeklyMatchesFrontendConstants() {
        assertEquals(0, new BigDecimal("1.0000").compareTo(goalService.toWeekly(new BigDecimal("30.4375"), "MONTH")));
        assertEquals(0, new BigDecimal("1.0000").compareTo(goalService.toWeekly(new BigDecimal("365.25"), "YEAR")));
        assertEquals(0, new BigDecimal("7").compareTo(goalService.toWeekly(new BigDecimal("1"), "DAY")));
        assertEquals(0, new BigDecimal("5").compareTo(goalService.toWeekly(new BigDecimal("5"), "WEEK")));
    }

    @Test
    void testAddTargetHistoryRejectsValidToBeforeValidFrom() {
        Long goalId = 1L;
        Goal goal = new Goal();
        goal.setId(goalId);
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(any(), any()))
                .thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> goalService.addTargetHistory(goalId, LocalDate.of(2026, 1, 10), LocalDate.of(2026, 1, 1),
                        new BigDecimal("5"), "WEEK"));
        assertTrue(ex.getMessage().contains("validTo"));
        verify(targetHistoryRepository, never()).save(any());
    }

    @Test
    void testUpdateTargetHistoryRejectsOverlappingValidFrom() {
        Long goalId = 1L;
        Long historyId = 2L;
        TargetHistory history = new TargetHistory();
        history.setId(historyId);
        history.setGoalId(goalId);
        history.setValidFrom(LocalDate.of(2026, 1, 5));
        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(history));

        TargetHistory previous = new TargetHistory();
        previous.setId(1L);
        previous.setGoalId(goalId);
        previous.setValidFrom(LocalDate.of(2026, 1, 3));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanOrderByValidFromDesc(goalId, LocalDate.of(2026, 1, 3)))
                .thenReturn(Optional.of(previous));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> goalService.updateTargetHistory(goalId, historyId, LocalDate.of(2026, 1, 3),
                        null, new BigDecimal("5"), "WEEK"));
        assertTrue(ex.getMessage().contains("validFrom"));
        verify(targetHistoryRepository, never()).save(any());
    }

    @Test
    void testUpdateTargetHistoryRelinksPreviousValidTo() {
        Long goalId = 1L;
        Long historyId = 3L;
        TargetHistory history = new TargetHistory();
        history.setId(historyId);
        history.setGoalId(goalId);
        history.setValidFrom(LocalDate.of(2026, 1, 10));
        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(history));

        TargetHistory previous = new TargetHistory();
        previous.setId(1L);
        previous.setGoalId(goalId);
        previous.setValidFrom(LocalDate.of(2026, 1, 5));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanOrderByValidFromDesc(goalId, LocalDate.of(2026, 1, 15)))
                .thenReturn(Optional.of(previous));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId))
                .thenReturn(java.util.List.of(previous, history));

        goalService.updateTargetHistory(goalId, historyId, LocalDate.of(2026, 1, 15),
                null, new BigDecimal("5"), "WEEK");

        verify(targetHistoryRepository).saveAll(argThat(list -> {
            TargetHistory prev = ((List<TargetHistory>) list).get(0);
            return prev.getValidTo() != null && prev.getValidTo().equals(LocalDate.of(2026, 1, 15));
        }));
    }
}
