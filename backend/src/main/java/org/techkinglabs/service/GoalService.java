package org.techkinglabs.service;

import org.springframework.transaction.annotation.Transactional;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.exception.GoalNotFoundException;
import org.techkinglabs.model.Period;
import org.techkinglabs.repository.GoalRepository;
import org.techkinglabs.repository.DailyEntryRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class GoalService {

    private final GoalRepository goalRepository;

    private final DailyEntryRepository dailyEntryRepository;
    private final TargetHistoryService targetHistoryService;
    private final Clock clock;

    public GoalService(GoalRepository goalRepository, DailyEntryRepository dailyEntryRepository, TargetHistoryService targetHistoryService, Clock clock) {
        this.goalRepository = goalRepository;
        this.dailyEntryRepository = dailyEntryRepository;
        this.targetHistoryService = targetHistoryService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<Goal> getGoals(Boolean active) {
        if (active == null) {
            return goalRepository.findAll();
        }
        return active ? goalRepository.findByActiveTrue() : goalRepository.findByActiveFalse();
    }

    @Transactional(readOnly = true)
    public Optional<Goal> getGoalById(Long id) {
        return goalRepository.findById(id);
    }

    @Transactional
    public Goal createGoal(Goal goal, BigDecimal initialTargetValue, Period initialPeriod) {
        Goal saved = goalRepository.save(goal);
        if (initialTargetValue != null && initialPeriod != null) {
            targetHistoryService.addTargetHistory(
                    saved.getId(),
                    LocalDate.now(clock),
                    null,
                    initialTargetValue,
                    initialPeriod
            );
        }
        return saved;
    }

    @Transactional
    public Goal updateGoal(Goal goal) {
        return goalRepository.save(goal);
    }

    @Transactional
    public void deleteGoal(Long id) {
        Goal goal = goalRepository.findById(id)
                .orElseThrow(() -> new GoalNotFoundException(id));

        dailyEntryRepository.deleteByGoalId(id);
        targetHistoryService.deleteAllTargetHistoryByGoalId(id);

        goalRepository.delete(goal);
    }
}
