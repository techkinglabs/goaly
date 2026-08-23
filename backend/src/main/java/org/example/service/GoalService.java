package org.example.service;

import org.example.entity.Goal;
import org.example.entity.TargetHistory;
import org.example.exception.ResourceNotFoundException;
import org.example.repository.GoalRepository;
import org.example.repository.TargetHistoryRepository;
import org.example.repository.DailyEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class GoalService {

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private TargetHistoryRepository targetHistoryRepository;

    @Autowired
    private DailyEntryRepository dailyEntryRepository;

    public List<Goal> getAllActiveGoals() {
        return goalRepository.findByIsActiveTrue();
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

    public Goal createGoal(Goal goal) {
        Goal saved = goalRepository.save(goal);

        BigDecimal seedValue = goal.getAmountPerPeriod() != null ? goal.getAmountPerPeriod() : goal.getTargetValue();
        if (seedValue == null) {
            seedValue = BigDecimal.ZERO;
        }

        TargetHistory history = new TargetHistory();
        history.setGoalId(saved.getId());
        history.setValidFrom(LocalDate.now());
        history.setValue(seedValue);
        targetHistoryRepository.save(history);

        saved.setTargetValue(seedValue);
        return goalRepository.save(saved);
    }

    public Goal updateGoalInDb(Goal goal) {
        return goalRepository.save(goal);
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteGoal(Long id) {
        Goal goal = goalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + id));

        dailyEntryRepository.deleteByGoalId(id);
        targetHistoryRepository.findByGoalIdOrderByValidFromAsc(id)
                .forEach(targetHistoryRepository::delete);

        goalRepository.delete(goal);
    }

    public TargetHistory addTargetHistory(Long goalId, LocalDate validFrom, LocalDate validTo, BigDecimal value, String period) {
        Goal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + goalId));

        String normalizedPeriod = normalizePeriod(period);
        if (validTo != null && validTo.isBefore(validFrom)) {
            throw new IllegalArgumentException("validTo must not be before validFrom");
        }
        Optional<TargetHistory> existing = targetHistoryRepository
                .findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(goalId, validFrom);
        TargetHistory history;
        if (existing.isPresent() && existing.get().getValidFrom().isEqual(validFrom)) {
            history = existing.get();
            history.setValue(value);
            history.setPeriod(normalizedPeriod);
            if (validTo != null) {
                history.setValidTo(validTo);
            }
        } else {
            history = new TargetHistory();
            history.setGoalId(goalId);
            history.setValidFrom(validFrom);
            history.setValidTo(validTo);
            history.setValue(value);
            history.setPeriod(normalizedPeriod);
        }
        TargetHistory saved = targetHistoryRepository.save(history);

        targetHistoryRepository.findFirstByGoalIdAndValidFromLessThanOrderByValidFromDesc(goalId, validFrom)
                .ifPresent(prev -> {
                    prev.setValidTo(validFrom);
                    targetHistoryRepository.save(prev);
                });

        if (validFrom != null && !validFrom.isAfter(LocalDate.now())) {
            goal.setAmountPerPeriod(value);
            goal.setPeriod(normalizedPeriod);
            goal.setTargetValue(toWeekly(value, normalizedPeriod));
            goalRepository.save(goal);
        }

        return saved;
    }

    public TargetHistory updateTargetHistory(Long goalId, Long historyId, LocalDate validFrom, LocalDate validTo, BigDecimal value, String period) {
        TargetHistory history = targetHistoryRepository.findById(historyId)
                .orElseThrow(() -> new ResourceNotFoundException("Target history not found with id: " + historyId));
        if (!goalId.equals(history.getGoalId())) {
            throw new ResourceNotFoundException("Target history not found with id: " + historyId);
        }
        String normalizedPeriod = normalizePeriod(period);
        if (validTo != null && validTo.isBefore(validFrom)) {
            throw new IllegalArgumentException("validTo must not be before validFrom");
        }
        TargetHistory previous = targetHistoryRepository
                .findFirstByGoalIdAndValidFromLessThanOrderByValidFromDesc(goalId, validFrom)
                .orElse(null);
        if (previous != null && previous.getId() != null && !previous.getId().equals(historyId)
                && !validFrom.isAfter(previous.getValidFrom())) {
            throw new IllegalArgumentException("validFrom must be after the previous history entry's validFrom");
        }
        history.setValidFrom(validFrom);
        history.setValidTo(validTo);
        history.setValue(value);
        history.setPeriod(normalizedPeriod);
        TargetHistory saved = targetHistoryRepository.save(history);
        relinkTargetHistory(goalId);
        return saved;
    }

    private String normalizePeriod(String period) {
        if (period == null) return "WEEK";
        return switch (period.toUpperCase()) {
            case "DAY", "DAILY", "D" -> "DAY";
            case "WEEK", "WEEKLY", "W" -> "WEEK";
            case "MONTH", "MONTHLY", "M" -> "MONTH";
            case "YEAR", "YEARLY", "ANNUAL", "Y" -> "YEAR";
            case "WORKWEEK", "WORK_WEEK", "WW" -> "WORKWEEK";
            case "WEEKEND", "WE" -> "WEEKEND";
            default -> "WEEK";
        };
    }

    BigDecimal toWeekly(BigDecimal value, String period) {
        return switch (period) {
            case "DAY" -> value.multiply(BigDecimal.valueOf(7));
            case "MONTH" -> value.divide(BigDecimal.valueOf(30.4375), 4, java.math.RoundingMode.HALF_UP);
            case "YEAR" -> value.divide(BigDecimal.valueOf(365.25), 4, java.math.RoundingMode.HALF_UP);
            case "WORKWEEK" -> value.divide(BigDecimal.valueOf(5), 4, java.math.RoundingMode.HALF_UP);
            case "WEEKEND" -> value.divide(BigDecimal.valueOf(2), 4, java.math.RoundingMode.HALF_UP);
            default -> value;
        };
    }

    public void deleteTargetHistory(Long goalId, Long historyId) {
        TargetHistory history = targetHistoryRepository.findById(historyId)
                .orElseThrow(() -> new ResourceNotFoundException("Target history not found with id: " + historyId));
        if (!goalId.equals(history.getGoalId())) {
            throw new ResourceNotFoundException("Target history not found with id: " + historyId);
        }
        targetHistoryRepository.delete(history);
        relinkTargetHistory(goalId);
    }

    private void relinkTargetHistory(Long goalId) {
        List<TargetHistory> entries = targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId);
        for (int i = 0; i < entries.size(); i++) {
            LocalDate nextFrom = (i + 1 < entries.size()) ? entries.get(i + 1).getValidFrom() : null;
            entries.get(i).setValidTo(nextFrom);
        }
        targetHistoryRepository.saveAll(entries);
    }

    public List<TargetHistory> getTargetHistory(Long goalId) {
        return targetHistoryRepository.findByGoalIdOrderByValidFromAsc(goalId);
    }

    public BigDecimal getEffectiveTarget(Long goalId, LocalDate date) {
        return targetHistoryRepository
                .findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(goalId, date)
                .map(TargetHistory::getValue)
                .orElse(BigDecimal.ZERO);
    }
}
