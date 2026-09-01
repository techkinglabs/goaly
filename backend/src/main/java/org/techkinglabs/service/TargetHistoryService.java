package org.techkinglabs.service;

import org.springframework.stereotype.Service;
import org.techkinglabs.entity.TargetHistory;
import org.techkinglabs.exception.ResourceNotFoundException;
import org.techkinglabs.model.Period;
import org.techkinglabs.repository.TargetHistoryRepository;
import java.math.BigDecimal;
import java.time.LocalDate;

@Service
public class TargetHistoryService {

    private final TargetHistoryRepository targetHistoryRepository;
    private final GoalService goalService;

    public TargetHistoryService(TargetHistoryRepository targetHistoryRepository, GoalService goalService) {
        this.targetHistoryRepository = targetHistoryRepository;
        this.goalService = goalService;
    }

    public void deleteTargetHistory(Long id, Long historyId) {
        TargetHistory history = targetHistoryRepository.findById(historyId)
                .orElseThrow(() -> new ResourceNotFoundException("Target history not found with id: " + historyId));
        if (!id.equals(history.getGoalId())) {
            throw new ResourceNotFoundException("Target history not found with id: " + historyId);
        }
        targetHistoryRepository.delete(history);
        goalService.relinkTargetHistory(id);
    }

    public TargetHistory addTargetHistory(Long goalId, LocalDate validFrom, LocalDate validTo, BigDecimal value, Period period) {
        return goalService.addTargetHistory(goalId, validFrom, validTo, value, period);
    }

    public TargetHistory updateTargetHistory(Long goalId, Long historyId, LocalDate validFrom, LocalDate validTo, BigDecimal value, Period period) {
        return goalService.updateTargetHistory(goalId, historyId, validFrom, validTo, value, period);
    }
}
