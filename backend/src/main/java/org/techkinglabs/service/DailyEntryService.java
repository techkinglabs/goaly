package org.techkinglabs.service;

import org.techkinglabs.entity.DailyEntry;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.exception.DuplicateDayException;
import org.techkinglabs.exception.ResourceNotFoundException;
import org.techkinglabs.repository.DailyEntryRepository;
import org.techkinglabs.repository.GoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class DailyEntryService {

    @Autowired
    private DailyEntryRepository dailyEntryRepository;

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private GoalService goalService;

    public List<DailyEntry> getEntriesByGoalId(Long goalId) {
        return dailyEntryRepository.findByGoalIdOrderByEntryDate(goalId);
    }

    public List<DailyEntry> getAllEntries() {
        return dailyEntryRepository.findAll();
    }

    public Optional<DailyEntry> getEntryById(Long id) {
        return dailyEntryRepository.findById(id);
    }

    public DailyEntry createDailyEntry(DailyEntry entry) {
        Goal goal = goalRepository.findById(entry.getGoalId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + entry.getGoalId()));

        BigDecimal effectiveTarget = goalService.getEffectiveTarget(entry.getGoalId(), entry.getEntryDate());
        entry.setTargetValue(effectiveTarget);

        return dailyEntryRepository.save(entry);
    }

    public DailyEntry updateDailyEntryInDb(DailyEntry entry) {
        Goal goal = goalRepository.findById(entry.getGoalId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + entry.getGoalId()));

        if (dailyEntryRepository.existsByGoalIdAndEntryDateAndIdNot(
                entry.getGoalId(), entry.getEntryDate(), entry.getId())) {
            throw new DuplicateDayException("An entry for this goal on " + entry.getEntryDate() + " already exists");
        }

        BigDecimal effectiveTarget = goalService.getEffectiveTarget(entry.getGoalId(), entry.getEntryDate());
        entry.setTargetValue(effectiveTarget);

        return dailyEntryRepository.save(entry);
    }

    public void deleteDailyEntry(Long id) {
        DailyEntry entry = dailyEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Daily entry not found with id: " + id));

        dailyEntryRepository.delete(entry);
    }

    public void deleteByGoalId(Long goalId) {
        dailyEntryRepository.deleteByGoalId(goalId);
    }
}
