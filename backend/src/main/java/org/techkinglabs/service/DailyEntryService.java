package org.techkinglabs.service;

import org.techkinglabs.entity.DailyEntry;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.exception.ResourceNotFoundException;
import org.techkinglabs.repository.DailyEntryRepository;
import org.techkinglabs.repository.GoalRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class DailyEntryService {

    private final DailyEntryRepository dailyEntryRepository;
    private final GoalRepository goalRepository;
    private final GoalService goalService;
    private final Clock clock;

    public DailyEntryService(DailyEntryRepository dailyEntryRepository, GoalRepository goalRepository, GoalService goalService, Clock clock) {
        this.dailyEntryRepository = dailyEntryRepository;
        this.goalRepository = goalRepository;
        this.goalService = goalService;
        this.clock = clock;
    }


    public List<DailyEntry> getEntriesByGoalId(Long goalId) {
        return dailyEntryRepository.findByGoalIdOrderByEntryDate(goalId);
    }

    public List<DailyEntry> getAllEntries() {
        return dailyEntryRepository.findAll();
    }

    public List<DailyEntry> getEntriesFrom(LocalDate from) {
        if (from == null) {
            return dailyEntryRepository.findAll();
        }
        return dailyEntryRepository.findByEntryDateGreaterThanEqualOrderByEntryDate(from);
    }

    public Optional<DailyEntry> getEntryById(Long id) {
        return dailyEntryRepository.findById(id);
    }

    public DailyEntry createDailyEntry(DailyEntry entry) {
        if (entry.getEntryDate().isAfter(LocalDate.now(clock))) {
            throw new IllegalArgumentException("Entry date must not be in the future");
        }

        Goal goal = goalRepository.findById(entry.getGoalId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + entry.getGoalId()));

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

    public void deleteByGoalId(Long goalId) {
        dailyEntryRepository.deleteByGoalId(goalId);
    }
}
