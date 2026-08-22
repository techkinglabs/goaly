package org.example.service;

import org.example.entity.Goal;
import org.example.repository.GoalRepository;
import org.example.repository.TargetHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
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
}
