package org.techkinglabs.service;

import org.techkinglabs.entity.Goal;
import org.techkinglabs.entity.TargetHistory;
import org.techkinglabs.model.Period;
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
        goal.setPeriod(Period.WEEK);

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
    void testAddTargetHistoryRejectsValidToBeforeValidFrom() {
        Long goalId = 1L;
        Goal goal = new Goal();
        goal.setId(goalId);
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(any(), any()))
                .thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> goalService.addTargetHistory(goalId, LocalDate.of(2026, 1, 10), LocalDate.of(2026, 1, 1),
                        new BigDecimal("5"), Period.WEEK));
        assertTrue(ex.getMessage().contains("validTo"));
        verify(targetHistoryRepository, never()).save(any());
    }

    @Test
    void testUpdateTargetHistoryRejectsMoveIntoPreviousRange() {
        Long goalId = 1L;
        Long historyId = 2L;
        TargetHistory history = new TargetHistory();
        history.setId(historyId);
        history.setGoalId(goalId);
        history.setValidFrom(LocalDate.of(2026, 1, 5));
        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(history));

        // Moving validFrom to 2026-01-03 falls inside the previous entry [01-01, 01-04].
        when(targetHistoryRepository.findOverlapping(goalId, LocalDate.of(2026, 1, 3), historyId))
                .thenReturn(Optional.of(new TargetHistory()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> goalService.updateTargetHistory(goalId, historyId, LocalDate.of(2026, 1, 3),
                        null, new BigDecimal("5"), Period.WEEK));
        assertTrue(ex.getMessage().contains("overlaps"));
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
        when(targetHistoryRepository.save(any(TargetHistory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TargetHistory previous = new TargetHistory();
        previous.setId(1L);
        previous.setGoalId(goalId);
        previous.setValidFrom(LocalDate.of(2026, 1, 5));
        previous.setValidTo(LocalDate.of(2026, 1, 9));
        when(targetHistoryRepository.findOverlapping(goalId, LocalDate.of(2026, 1, 15), historyId))
                .thenReturn(Optional.empty());
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId))
                .thenReturn(java.util.List.of(previous, history));

        goalService.updateTargetHistory(goalId, historyId, LocalDate.of(2026, 1, 15),
                null, new BigDecimal("5"), Period.WEEK);

        verify(targetHistoryRepository).saveAll(argThat(list -> {
            List<TargetHistory> cast = (List<TargetHistory>) list;
            TargetHistory prev = cast.get(0);
            TargetHistory hist = cast.get(1);
            return prev.getValidTo() != null && prev.getValidTo().equals(LocalDate.of(2026, 1, 14))
                    && hist.getValidTo() == null;
        }));
    }

    @Test
    void testUpdateTargetHistoryRejectsStrictOverlap() {
        Long goalId = 1L;
        Long historyId = 3L;
        TargetHistory history = new TargetHistory();
        history.setId(historyId);
        history.setGoalId(goalId);
        history.setValidFrom(LocalDate.of(2026, 1, 10));
        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(history));
        when(targetHistoryRepository.findOverlapping(goalId, LocalDate.of(2026, 1, 7), historyId))
                .thenReturn(Optional.of(new TargetHistory()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> goalService.updateTargetHistory(goalId, historyId, LocalDate.of(2026, 1, 7),
                        null, new BigDecimal("5"), Period.WEEK));
        assertTrue(ex.getMessage().contains("overlaps"));
        verify(targetHistoryRepository, never()).save(any());
    }
}
