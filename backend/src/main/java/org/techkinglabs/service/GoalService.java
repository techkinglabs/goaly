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
    private final TargetHistoryService targetHistory;

    private final Clock clock;

    public GoalService(GoalRepository goalRepository, DailyEntryRepository dailyEntryRepository, TargetHistoryService targetHistory, Clock clock) {
        this.goalRepository = goalRepository;
        this.dailyEntryRepository = dailyEntryRepository;
        this.targetHistory = targetHistory;
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
    public Goal createGoal(Goal goal) {
        BigDecimal seedValue = Optional.ofNullable(goal.getAmountPerPeriod())
                .or(() -> Optional.ofNullable(goal.getTargetValue()))
                .orElse(BigDecimal.ZERO);

        goal.setAmountPerPeriod(seedValue);
        goal.setTargetValue(seedValue);
        Goal saved = goalRepository.save(goal);
        Period period = saved.getPeriod()!= null? saved.getPeriod() : Period.WEEK;

        targetHistory.addTargetHistory(goal.getId(),LocalDate.now(clock),null,seedValue,period);

        return saved;
    }

    @Transactional
    public Goal updateGoal(Goal goal, BigDecimal effectiveSeedValue) {
        Goal saved = goalRepository.save(goal);
        LocalDate today = LocalDate.now(clock);
        BigDecimal currentValue = targetHistory.getEffectiveTarget(goal.getId(), today);
        if (currentValue.compareTo(effectiveSeedValue) != 0) {
            targetHistory.addTargetHistory(goal.getId(), today, null, effectiveSeedValue, goal.getPeriod());
            saved.setTargetValue(effectiveSeedValue);
            saved.setAmountPerPeriod(effectiveSeedValue);
            saved = goalRepository.save(saved);
        }
        return saved;
    }

    @Transactional
    public void deleteGoal(Long id) {
        Goal goal = goalRepository.findById(id)
                .orElseThrow(() -> new GoalNotFoundException(id));

        dailyEntryRepository.deleteByGoalId(id);
        targetHistory.deleteAllTargetHistoryByGoalId(id);

        goalRepository.delete(goal);
    }
}
