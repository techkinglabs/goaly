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
import static org.mockito.ArgumentMatchers.anyLong;
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

        when(goalRepository.save(any(Goal.class))).thenReturn(goal);

        // When
        Goal result = goalService.createGoal(goal);

        // Then
        assertEquals(goal, result);
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

        TargetHistory result = goalService.addTargetHistory(goalId, LocalDate.of(2026, 1, 5), null,
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

        // Regression: with validTo == null the previous query always returned empty and skipped validation.
        when(targetHistoryRepository.findOverlappingOnDate(goalId, null, 2L))
                .thenReturn(Optional.of(new TargetHistory()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> goalService.addTargetHistory(goalId, LocalDate.of(2026, 1, 5), null,
                        new BigDecimal("7"), Period.WEEK));
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

    @Test
    void testUpdateGoalRedirectsChangedValueThroughTargetHistory() {
        Long goalId = 1L;
        LocalDate today = LocalDate.now();
        Goal goal = new Goal();
        goal.setId(goalId);
        goal.setName("Sleep at 23:00");
        when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(goalRepository.findById(anyLong())).thenReturn(Optional.of(goal));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(anyLong(), any(LocalDate.class)))
                .thenReturn(Optional.of(new TargetHistory() {{
                    setId(2L); setGoalId(goalId); setValidFrom(LocalDate.of(2026, 1, 1));
                    setValue(new BigDecimal("5")); setPeriod(Period.WEEK);
                }}));
        when(targetHistoryRepository.findOverlappingOnDate(anyLong(), any(LocalDate.class), any())).thenReturn(Optional.empty());
        when(targetHistoryRepository.save(any(TargetHistory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Goal result = goalService.updateGoal(goal, new BigDecimal("8"));

        verify(targetHistoryRepository).save(argThat(h -> h.getValidFrom().equals(today)
                && h.getValue().compareTo(new BigDecimal("8")) == 0));
        assertEquals(0, new BigDecimal("8").compareTo(result.getTargetValue()));
        assertEquals(0, new BigDecimal("8").compareTo(result.getAmountPerPeriod()));
    }

    @Test
    void testUpdateGoalNoOpWhenEffectiveTargetUnchanged() {
        Long goalId = 1L;
        Goal goal = new Goal();
        goal.setId(goalId);
        goal.setTargetValue(new BigDecimal("8"));
        goal.setAmountPerPeriod(new BigDecimal("8"));
        when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(goalRepository.findById(anyLong())).thenReturn(Optional.of(goal));

        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(anyLong(), any(LocalDate.class)))
                .thenReturn(Optional.of(new TargetHistory() {{
                    setId(2L); setGoalId(goalId); setValue(new BigDecimal("8"));
                }}));

        Goal result = goalService.updateGoal(goal, new BigDecimal("8"));

        verify(targetHistoryRepository, never()).save(any());
        assertEquals(0, new BigDecimal("8").compareTo(result.getTargetValue()));
    }

    @Test
    void testUpdateTargetHistorySyncsEntityWhenEditedSegmentCoversToday() {
        Long goalId = 1L;
        Long historyId = 3L;
        Goal goal = new Goal();
        goal.setId(goalId);
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));
        TargetHistory current = new TargetHistory();
        current.setId(historyId);
        current.setGoalId(goalId);
        current.setValue(new BigDecimal("5"));
        current.setValidFrom(LocalDate.now().minusDays(30));
        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(current));
        when(targetHistoryRepository.save(any(TargetHistory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDate today = LocalDate.now();
        LocalDate oldFrom = today.minusDays(30);
        TargetHistory previous = new TargetHistory();
        previous.setId(1L);
        previous.setGoalId(goalId);
        previous.setValidFrom(LocalDate.of(2025, 1, 1));
        when(targetHistoryRepository.findOverlapping(anyLong(), any(LocalDate.class), eq(historyId))).thenReturn(Optional.empty());
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId)).thenReturn(List.of(previous, current));
        // After relink the edited entry is effective from today for this goal.
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId)).thenReturn(List.of(current));
        // After relink the edited entry (moved to start from today) is effective for this goal.
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(eq(goalId), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    LocalDate date = invocation.getArgument(1);
                    if (!current.getValidFrom().isAfter(date)) {
                        return Optional.of(current);
                    }
                    return Optional.empty();
                });

        // Edit the segment currently in force so it now runs from today.
        goalService.updateTargetHistory(goalId, historyId, oldFrom.plusDays(-1), null, new BigDecimal("7"), Period.WEEK);

        assertEquals(0, new BigDecimal("7").compareTo(goal.getTargetValue()));
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
        current.setValidFrom(LocalDate.now().minusDays(10));

        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(current));
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(eq(goalId), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        goalService.deleteTargetHistory(goalId, historyId);

        verify(targetHistoryRepository).delete(current);
        verify(goalRepository).save(argThat(g ->
                g.getTargetValue().compareTo(BigDecimal.ZERO) == 0 &&
                g.getAmountPerPeriod().compareTo(BigDecimal.ZERO) == 0));
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
        current.setValidFrom(LocalDate.now().minusDays(10));
        current.setPeriod(Period.WEEK);

        TargetHistory previous = new TargetHistory();
        previous.setId(1L);
        previous.setGoalId(goalId);
        previous.setValue(new BigDecimal("3"));
        previous.setValidFrom(LocalDate.now().minusDays(30));
        previous.setPeriod(Period.MONTH);

        when(targetHistoryRepository.findById(historyId)).thenReturn(Optional.of(current));
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goal));
        when(targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(eq(goalId), any(LocalDate.class)))
                .thenReturn(Optional.of(previous));
        when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId)).thenReturn(List.of(previous));

        goalService.deleteTargetHistory(goalId, historyId);

        verify(targetHistoryRepository).delete(current);
        verify(goalRepository).save(argThat(g ->
                g.getTargetValue().compareTo(new BigDecimal("3")) == 0 &&
                g.getAmountPerPeriod().compareTo(new BigDecimal("3")) == 0 &&
                g.getPeriod() == Period.MONTH));
    }
}
