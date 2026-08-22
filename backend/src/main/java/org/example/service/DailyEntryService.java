package org.example.service;

import org.example.entity.DailyEntry;
import org.example.entity.Goal;
import org.example.exception.DuplicateDayException;
import org.example.exception.ResourceNotFoundException;
import org.example.repository.DailyEntryRepository;
import org.example.repository.GoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
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

        if (dailyEntryRepository.existsByGoalIdAndEntryDate(entry.getGoalId(), entry.getEntryDate())) {
            throw new DuplicateDayException("An entry for goal " + entry.getGoalId()
                    + " and date " + entry.getEntryDate() + " already exists");
        }

        BigDecimal effectiveTarget = goalService.getEffectiveTarget(entry.getGoalId(), entry.getEntryDate());
        entry.setTargetValue(effectiveTarget);

        return dailyEntryRepository.save(entry);
    }

    public DailyEntry updateDailyEntryInDb(DailyEntry entry) {
        Goal goal = goalRepository.findById(entry.getGoalId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + entry.getGoalId()));

        BigDecimal effectiveTarget = goalService.getEffectiveTarget(entry.getGoalId(), entry.getEntryDate());
        entry.setTargetValue(effectiveTarget);

        return dailyEntryRepository.save(entry);
    }

    public void deleteDailyEntry(Long id) {
        DailyEntry entry = dailyEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Daily entry not found with id: " + id));

        dailyEntryRepository.delete(entry);
    }
}
