package org.techkinglabs.service;

import org.techkinglabs.entity.Goal;
import org.techkinglabs.entity.TargetHistory;
import org.techkinglabs.exception.GoalNotFoundException;
import org.techkinglabs.model.Period;
import org.techkinglabs.repository.TargetHistoryRepository;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TargetHistoryServiceTest {

    @Mock
    private TargetHistoryRepository targetHistoryRepository;

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private Clock clock;

    @InjectMocks
    private TargetHistoryService targetHistoryService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.instant()).thenReturn(Instant.parse("2026-01-01T00:00:00Z"));
    }

    @Test
    void testAddTargetHistoryRejectsValidToBeforeValidFrom() {
        Long goalId = 1L;
        Goal goal = new Goal();
        goal.setId(goalId);
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> targetHistoryService.addTargetHistory(goalId, LocalDate.of(2026, 1, 10), LocalDate.of(2026, 1, 1),
                        new BigDecimal("5"), Period.WEEK));
        assertTrue(ex.getMessage().contains("validTo"));
        verify(targetHistoryRepository, never()).save(any());
    }

    @Test
    void testAddTargetHistoryThrowsGoalNotFoundExceptionWhenGoalMissing() {
        Long goalId = 999L;
        when(goalRepository.findById(goalId)).thenReturn(Optional.empty());

        GoalNotFoundException ex = assertThrows(GoalNotFoundException.class,
                () -> targetHistoryService.addTargetHistory(goalId, LocalDate.of(2026, 1, 10), null,
                        new BigDecimal("5"), Period.WEEK));
        assertTrue(ex.getMessage().contains("999"));
        verify(targetHistoryRepository, never()).save(any());
    }

    @Test
    void testUpdateTargetHistoryRejectsMoveIntoPreviousRange() {
        Long goalId = 1L;
        Long historyId = 2L;
        Goal goal = new Goal();
        goal.setId(goalId);
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));

        TargetHistory history = new TargetHistory();
        history.setId(historyId);
        history.setGoalId(goalId);
        history.setValidFrom(LocalDate.of(2026, 1, 5));
        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(history));

        when(targetHistoryRepository.findOverlapping(goalId, LocalDate.of(2026, 1, 3), historyId))
                .thenReturn(Optional.of(new TargetHistory()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> targetHistoryService.updateTargetHistory(goalId, historyId, LocalDate.of(2026, 1, 3),
                        null, new BigDecimal("5"), Period.WEEK));
        assertTrue(ex.getMessage().contains("overlaps"));
        verify(targetHistoryRepository, never()).save(any());
    }

    @Test
    void testAddTargetHistoryEditsExistingRecordWithNullValidTo() {
        Long goalId = 1L;
        Goal goal = new Goal();
        goal.setId(goalId);
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));

        TargetHistory existing = new TargetHistory();
        existing.setId(2L);
        existing.setGoalId(goalId);
        existing.setValidFrom(LocalDate.of(2026, 1, 5));
        existing.setValue(new BigDecimal("4"));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(goalId, LocalDate.of(2026, 1, 5)))
                .thenReturn(Optional.of(existing));
        when(targetHistoryRepository.findOverlappingOnDate(goalId, null, 2L))
                .thenReturn(Optional.empty());
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId))
                .thenReturn(List.of(existing));
        when(targetHistoryRepository.save(any(TargetHistory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TargetHistory result = targetHistoryService.addTargetHistory(goalId, LocalDate.of(2026, 1, 5), null,
                new BigDecimal("7"), Period.WEEK);

        assertEquals(existing, result);
        verify(targetHistoryRepository).findOverlappingOnDate(goalId, null, 2L);
    }

    @Test
    void testAddTargetHistoryDetectsOverlapWhenValidToIsNull() {
        Long goalId = 1L;
        Goal goal = new Goal();
        goal.setId(goalId);
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));

        TargetHistory existing = new TargetHistory();
        existing.setId(2L);
        existing.setGoalId(goalId);
        existing.setValidFrom(LocalDate.of(2026, 1, 5));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(goalId, LocalDate.of(2026, 1, 5)))
                .thenReturn(Optional.of(existing));

        when(targetHistoryRepository.findOverlappingOnDate(goalId, null, 2L))
                .thenReturn(Optional.of(new TargetHistory()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> targetHistoryService.addTargetHistory(goalId, LocalDate.of(2026, 1, 5), null,
                        new BigDecimal("7"), Period.WEEK));
        assertTrue(ex.getMessage().contains("overlaps"));
        verify(targetHistoryRepository, never()).save(any());
    }

    @Test
    void testUpdateTargetHistoryRelinksPreviousValidTo() {
        Long goalId = 1L;
        Long historyId = 3L;
        Goal goal = new Goal();
        goal.setId(goalId);
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));

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
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromGreaterThanOrderByValidFromAsc(goalId, LocalDate.of(2026, 1, 15)))
                .thenReturn(Optional.empty());
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId))
                .thenReturn(java.util.List.of(previous, history));

        targetHistoryService.updateTargetHistory(goalId, historyId, LocalDate.of(2026, 1, 15),
                null, new BigDecimal("5"), Period.WEEK);

        verify(targetHistoryRepository).saveAll(argThat((List<TargetHistory> list) -> {
            TargetHistory prev = list.get(0);
            TargetHistory hist = list.get(1);
            return prev.getValidTo() != null && prev.getValidTo().equals(LocalDate.of(2026, 1, 14))
                    && hist.getValidTo() == null;
        }));
    }

    @Test
    void testUpdateTargetHistoryRejectsStrictOverlap() {
        Long goalId = 1L;
        Long historyId = 3L;
        Goal goal = new Goal();
        goal.setId(goalId);
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));

        TargetHistory history = new TargetHistory();
        history.setId(historyId);
        history.setGoalId(goalId);
        history.setValidFrom(LocalDate.of(2026, 1, 10));
        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(history));
        when(targetHistoryRepository.findOverlapping(goalId, LocalDate.of(2026, 1, 7), historyId))
                .thenReturn(Optional.of(new TargetHistory()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> targetHistoryService.updateTargetHistory(goalId, historyId, LocalDate.of(2026, 1, 7),
                        null, new BigDecimal("5"), Period.WEEK));
        assertTrue(ex.getMessage().contains("overlaps"));
        verify(targetHistoryRepository, never()).save(any());
    }

    @Test
    void testUpdateTargetHistorySyncsEntityWhenEditedSegmentCoversToday() {
        Long goalId = 1L;
        Long historyId = 3L;
        Goal goal = new Goal();
        goal.setId(goalId);
        goal.setTargetValue(new BigDecimal("7"));
        goal.setPeriod(Period.WEEK);
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));

        TargetHistory current = new TargetHistory();
        current.setId(historyId);
        current.setGoalId(goalId);
        current.setValue(new BigDecimal("5"));
        current.setValidFrom(LocalDate.now(clock).minusDays(30));
        current.setPeriod(Period.WEEK);
        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(current));
        when(targetHistoryRepository.save(any(TargetHistory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDate today = LocalDate.now(clock);
        LocalDate oldFrom = today.minusDays(30);
        TargetHistory previous = new TargetHistory();
        previous.setId(1L);
        previous.setGoalId(goalId);
        previous.setValidFrom(LocalDate.of(2025, 1, 1));
        previous.setPeriod(Period.WEEK);
        when(targetHistoryRepository.findOverlapping(anyLong(), any(LocalDate.class), eq(historyId))).thenReturn(Optional.empty());
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromGreaterThanOrderByValidFromAsc(anyLong(), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId)).thenReturn(List.of(previous, current));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(eq(goalId), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    LocalDate date = invocation.getArgument(1);
                    if (!current.getValidFrom().isAfter(date)) {
                        return Optional.of(current);
                    }
                    return Optional.empty();
                });

        targetHistoryService.updateTargetHistory(goalId, historyId, oldFrom.minusDays(1), null, new BigDecimal("7"), Period.WEEK);

        verify(goalRepository).save(any(Goal.class));
    }

    @Test
    void testDeleteTargetHistoryResyncsEntityWhenLastSegmentRemoved() {
        Long goalId = 1L;
        Long historyId = 2L;
        Goal goal = new Goal();
        goal.setId(goalId);
        goal.setTargetValue(new BigDecimal("5"));
        goal.setAmountPerPeriod(new BigDecimal("5"));
        goal.setPeriod(Period.WEEK);

        TargetHistory current = new TargetHistory();
        current.setId(historyId);
        current.setGoalId(goalId);
        current.setValue(new BigDecimal("5"));
        current.setValidFrom(LocalDate.now(clock).minusDays(10));
        current.setPeriod(Period.WEEK);

        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));
        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(current));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(eq(goalId), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        targetHistoryService.deleteTargetHistory(goalId, historyId);

        verify(targetHistoryRepository).delete(current);
        verify(goalRepository).save(any(Goal.class));
    }

    @Test
    void testDeleteTargetHistoryResyncsToPreviousSegmentWhenOlderExists() {
        Long goalId = 1L;
        Long historyId = 2L;
        Goal goal = new Goal();
        goal.setId(goalId);
        goal.setTargetValue(new BigDecimal("5"));
        goal.setAmountPerPeriod(new BigDecimal("5"));
        goal.setPeriod(Period.WEEK);

        TargetHistory current = new TargetHistory();
        current.setId(historyId);
        current.setGoalId(goalId);
        current.setValue(new BigDecimal("5"));
        current.setValidFrom(LocalDate.now(clock).minusDays(10));
        current.setPeriod(Period.WEEK);

        TargetHistory previous = new TargetHistory();
        previous.setId(1L);
        previous.setGoalId(goalId);
        previous.setValue(new BigDecimal("3"));
        previous.setValidFrom(LocalDate.now(clock).minusDays(30));
        previous.setPeriod(Period.MONTH);

        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));
        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(current));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(eq(goalId), any(LocalDate.class)))
                .thenReturn(Optional.of(previous));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId)).thenReturn(List.of(previous));

        targetHistoryService.deleteTargetHistory(goalId, historyId);

        verify(targetHistoryRepository).delete(current);
        verify(goalRepository).save(any(Goal.class));
    }

    @Test
    void testDeleteTargetHistoryThrowsGoalNotFoundExceptionWhenGoalMissing() {
        Long goalId = 999L;
        Long historyId = 2L;
        when(goalRepository.findById(goalId)).thenReturn(Optional.empty());

        GoalNotFoundException ex = assertThrows(GoalNotFoundException.class,
                () -> targetHistoryService.deleteTargetHistory(goalId, historyId));
        assertTrue(ex.getMessage().contains("999"));
        verify(targetHistoryRepository, never()).delete(any());
    }
}
