package org.techkinglabs.service;

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
import java.time.ZoneId;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GoalServiceTest {

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private DailyEntryRepository dailyEntryRepository;

    @Mock
    private TargetHistoryService targetHistoryService;

    @Mock
    private Clock clock;

    @InjectMocks
    private GoalService goalService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.instant()).thenReturn(Instant.parse("2026-01-01T00:00:00Z"));
    }

    @Test
    void testCreateGoalWithoutTargetHistory() {
        Goal goal = new Goal();
        goal.setName("Sleep at 23:00");
        goal.setUnit("hours");

        when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> {
            Goal g = invocation.getArgument(0);
            if (g.getId() == null) {
                g.setId(1L);
            }
            return g;
        });

        Goal result = goalService.createGoal(goal, null, null);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        verify(goalRepository).save(goal);
        verify(targetHistoryService, never()).addTargetHistory(any(), any(), any(), any(), any());
    }

    @Test
    void testCreateGoalWithInitialTarget() {
        Goal goal = new Goal();
        goal.setName("Run 5km");
        goal.setUnit("km");

        when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> {
            Goal g = invocation.getArgument(0);
            if (g.getId() == null) {
                g.setId(1L);
            }
            return g;
        });

        Goal result = goalService.createGoal(goal, BigDecimal.valueOf(5), org.techkinglabs.model.Period.DAY);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        verify(goalRepository).save(goal);
        verify(targetHistoryService).addTargetHistory(eq(1L), any(java.time.LocalDate.class), any(), eq(BigDecimal.valueOf(5)), eq(org.techkinglabs.model.Period.DAY));
    }

    @Test
    void testGetGoalById() {
        Long id = 1L;
        Goal goal = new Goal();
        goal.setId(id);
        goal.setName("Sleep at 23:00");

        when(goalRepository.findById(id)).thenReturn(Optional.of(goal));

        Optional<Goal> result = goalService.getGoalById(id);

        assertTrue(result.isPresent());
        assertEquals(goal, result.get());
        verify(goalRepository).findById(id);
    }

    @Test
    void testUpdateGoal() {
        Long goalId = 1L;
        Goal goal = new Goal();
        goal.setId(goalId);
        goal.setName("Sleep at 23:00");
        when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Goal result = goalService.updateGoal(goal);

        assertEquals(goal, result);
        verify(goalRepository, org.mockito.Mockito.atLeastOnce()).save(goal);
    }

    @Test
    void testDeleteGoal() {
        Long id = 1L;
        Goal goal = new Goal();
        goal.setId(id);
        goal.setName("Sleep at 23:00");
        when(goalRepository.findById(id)).thenReturn(Optional.of(goal));

        goalService.deleteGoal(id);

        verify(goalRepository).findById(id);
        verify(dailyEntryRepository).deleteByGoalId(id);
        verify(targetHistoryService).deleteAllTargetHistoryByGoalId(id);
        verify(goalRepository).delete(goal);
    }

    @Test
    void testDeleteGoalThrowsWhenGoalNotFound() {
        Long id = 999L;
        when(goalRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(org.techkinglabs.exception.ResourceNotFoundException.class,
                () -> goalService.deleteGoal(id));
        verify(goalRepository).findById(id);
        verify(dailyEntryRepository, never()).deleteByGoalId(anyLong());
        verify(goalRepository, never()).delete(any());
    }
}
