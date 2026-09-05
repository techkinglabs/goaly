package org.techkinglabs.service;

import org.springframework.transaction.annotation.Transactional;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.entity.TargetHistory;
import org.techkinglabs.exception.ResourceNotFoundException;
import org.techkinglabs.model.Period;
import org.techkinglabs.repository.GoalRepository;
import org.techkinglabs.repository.TargetHistoryRepository;
import org.techkinglabs.repository.DailyEntryRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GoalService {

    private final GoalRepository goalRepository;

    private final TargetHistoryRepository targetHistoryRepository;

    private final DailyEntryRepository dailyEntryRepository;

    public GoalService(GoalRepository goalRepository, TargetHistoryRepository targetHistoryRepository, DailyEntryRepository dailyEntryRepository) {
        this.goalRepository = goalRepository;
        this.targetHistoryRepository = targetHistoryRepository;
        this.dailyEntryRepository = dailyEntryRepository;
    }

    public List<Goal> getGoals(Boolean active) {
        if (active == null) {
            return goalRepository.findAll();
        }
        return active ? goalRepository.findByIsActiveTrue() : goalRepository.findByIsActiveFalse();
    }

    public Optional<Goal> getGoalById(Long id) {
        return goalRepository.findById(id);
    }

    @Transactional
    public Goal createGoal(Goal goal) {
        Goal saved = goalRepository.save(goal);

        BigDecimal seedValue = Optional.ofNullable(goal.getAmountPerPeriod())
                .or(() -> Optional.ofNullable(goal.getTargetValue()))
                .orElse(BigDecimal.ZERO);

        TargetHistory history = new TargetHistory();
        history.setGoalId(saved.getId());
        history.setValidFrom(LocalDate.now());
        history.setValue(seedValue);
        history.setPeriod(saved.getPeriod());
        targetHistoryRepository.save(history);

        saved.setTargetValue(seedValue);
        return goalRepository.save(saved);
    }

    @Transactional
    public Goal updateGoal(Goal goal, BigDecimal effectiveSeedValue) {
        Goal saved = goalRepository.save(goal);
        LocalDate today = LocalDate.now();
        TargetHistory current = targetHistoryRepository
                .findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(goal.getId(), today)
                .orElse(null);
        if (current != null && effectiveSeedValue.compareTo(current.getValue()) == 0) {
            return saved;
        }
        TargetHistory overlapping = targetHistoryRepository
                .findOverlappingOnDate(goal.getId(), today, current != null ? current.getId() : null)
                .orElse(null);
        if (overlapping != null) {
            throw new IllegalArgumentException("Target history overlaps on date " + today + " for goal " + goal.getId());
        }
        TargetHistory newHistory = new TargetHistory();
        newHistory.setGoalId(goal.getId());
        newHistory.setValidFrom(today);
        newHistory.setValue(effectiveSeedValue);
        newHistory.setPeriod(goal.getPeriod() != null ? goal.getPeriod() : (current != null ? current.getPeriod() : null));
        targetHistoryRepository.save(newHistory);
        saved.setTargetValue(effectiveSeedValue);
        saved.setAmountPerPeriod(effectiveSeedValue);
        return goalRepository.save(saved);
    }

    @Transactional
    public void deleteGoal(Long id) {
        Goal goal = goalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + id));

        dailyEntryRepository.deleteByGoalId(id);
        targetHistoryRepository.deleteByGoalId(id);

        goalRepository.delete(goal);
    }

    public List<TargetHistory> getTargetHistory(Long goalId) {
        return targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId);
    }

    public Map<Long, List<TargetHistory>> getTargetHistoryByGoalIds(List<Long> goalIds) {
        if (goalIds == null || goalIds.isEmpty()) {
            return Map.of();
        }
        List<TargetHistory> histories = targetHistoryRepository.findByGoalIdInOrderByGoalIdAscValidFromAsc(goalIds);
        return histories.stream().collect(Collectors.groupingBy(TargetHistory::getGoalId));
    }

    @Transactional
    public TargetHistory addTargetHistory(Long goalId, LocalDate validFrom, LocalDate validTo, BigDecimal value, Period period) {
        Goal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + goalId));

        if (validTo != null && validTo.isBefore(validFrom)) {
            throw new IllegalArgumentException("validTo must not be before validFrom");
        }
        Optional<TargetHistory> existing = targetHistoryRepository
                .findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(goalId, validFrom);
        TargetHistory history;
        if (existing.isPresent() && existing.get().getValidFrom().isEqual(validFrom)) {
            history = existing.get();
            history.setValue(value);
            history.setPeriod(period);
            if (validTo != null) {
                history.setValidTo(validTo);
            }
            TargetHistory overlapping = targetHistoryRepository
                    .findOverlappingOnDate(goalId, validTo, history.getId())
                    .orElse(null);
            if (overlapping != null) {
                throw new IllegalArgumentException("validTo " + validTo + " overlaps an existing target history on goal " + goalId);
            }
        } else {
            TargetHistory overlapping = targetHistoryRepository
                    .findOverlapping(goalId, validFrom, null)
                    .orElse(null);
            if (overlapping != null) {
                throw new IllegalArgumentException("validFrom " + validFrom + " overlaps an existing target history on goal " + goalId);
            }
            history = new TargetHistory();
            history.setGoalId(goalId);
            history.setValidFrom(validFrom);
            history.setValidTo(validTo);
            history.setValue(value);
            history.setPeriod(period);
            TargetHistory next = targetHistoryRepository
                    .findFirstByGoalIdAndValidFromGreaterThanOrderByValidFromAsc(goalId, validFrom)
                    .orElse(null);
            if (next != null && validTo != null && !validTo.isBefore(next.getValidFrom())) {
                throw new IllegalArgumentException("validTo " + validTo + " overlaps with target history starting on " + next.getValidFrom());
            }
        }
        TargetHistory saved = targetHistoryRepository.save(history);

        relinkTargetHistory(goalId);

        if (validFrom != null && !validFrom.isAfter(LocalDate.now())) {
            applyEffectiveTarget(goal, value, period);
        }

        return targetHistoryRepository.findById(saved.getId()).orElse(saved);
    }

    @Transactional
    public TargetHistory updateTargetHistory(Long goalId, Long historyId, LocalDate validFrom, LocalDate validTo, BigDecimal value, Period period) {
        TargetHistory history = targetHistoryRepository.findById(historyId)
                .orElseThrow(() -> new ResourceNotFoundException("Target history not found with id: " + historyId));
        if (!goalId.equals(history.getGoalId())) {
            throw new ResourceNotFoundException("Target history not found with id: " + historyId);
        }
        if (validTo != null && validTo.isBefore(validFrom)) {
            throw new IllegalArgumentException("validTo must not be before validFrom");
        }
        TargetHistory overlapping = targetHistoryRepository
                .findOverlapping(goalId, validFrom, history.getId())
                .orElse(null);
        if (overlapping != null) {
            throw new IllegalArgumentException("validFrom " + validFrom + " overlaps an existing target history on goal " + goalId);
        }
        TargetHistory next = targetHistoryRepository
                .findFirstByGoalIdAndValidFromGreaterThanOrderByValidFromAsc(goalId, validFrom)
                .orElse(null);
        if (next != null && validTo != null && !validTo.isBefore(next.getValidFrom())) {
            throw new IllegalArgumentException("validTo " + validTo + " overlaps with target history starting on " + next.getValidFrom());
        }
        history.setValidFrom(validFrom);
        history.setValidTo(validTo);
        history.setValue(value);
        history.setPeriod(period);
        TargetHistory saved = targetHistoryRepository.save(history);
        relinkTargetHistory(goalId);
        TargetHistory effectiveToday = targetHistoryRepository
                .findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(goalId, LocalDate.now())
                .orElse(null);
        if (effectiveToday != null && effectiveToday.getId().equals(saved.getId())) {
            Goal goal = goalRepository.findById(goalId)
                    .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + goalId));
            applyEffectiveTarget(goal, saved.getValue(), saved.getPeriod());
        }
        return targetHistoryRepository.findById(saved.getId()).orElse(saved);
    }

    void relinkTargetHistory(Long goalId) {
        List<TargetHistory> entries = targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId);
        for (int i = 0; i < entries.size(); i++) {
            LocalDate nextFrom = (i + 1 < entries.size()) ? entries.get(i + 1).getValidFrom() : null;
            if (nextFrom != null) {
                entries.get(i).setValidTo(nextFrom.minusDays(1));
            } else {
                entries.get(i).setValidTo(null);
            }
        }
        targetHistoryRepository.saveAll(entries);
    }

    private void applyEffectiveTarget(Goal goal, BigDecimal value, Period period) {
        goal.setAmountPerPeriod(value);
        goal.setPeriod(period);
        goal.setTargetValue(value);
        goalRepository.save(goal);
    }

    public BigDecimal getEffectiveTarget(Long goalId, LocalDate date) {
        return targetHistoryRepository
                .findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(goalId, date)
                .map(TargetHistory::getValue)
                .orElse(BigDecimal.ZERO);
    }

    @Transactional
    public void deleteTargetHistory(Long id, Long historyId) {
        TargetHistory history = targetHistoryRepository.findById(historyId)
                .orElseThrow(() -> new ResourceNotFoundException("Target history not found with id: " + historyId));
        if (!id.equals(history.getGoalId())) {
            throw new ResourceNotFoundException("Target history not found with id: " + historyId);
        }
        targetHistoryRepository.delete(history);
        this.relinkTargetHistory(id);

        Goal goal = goalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + id));
        TargetHistory effectiveToday = targetHistoryRepository
                .findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(id, LocalDate.now())
                .orElse(null);
        if (effectiveToday != null) {
            applyEffectiveTarget(goal, effectiveToday.getValue(), effectiveToday.getPeriod());
        } else {
            applyEffectiveTarget(goal, BigDecimal.ZERO, goal.getPeriod());
        }
    }
}
