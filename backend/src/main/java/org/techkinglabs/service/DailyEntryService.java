package org.techkinglabs.service;

import org.springframework.transaction.annotation.Transactional;
import org.techkinglabs.entity.DailyEntry;
import org.techkinglabs.exception.GoalNotFoundException;
import org.techkinglabs.exception.ResourceNotFoundException;
import org.techkinglabs.repository.DailyEntryRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class DailyEntryService {

    private final DailyEntryRepository dailyEntryRepository;
    private final GoalService goalService;
    private final Clock clock;
    private final TargetHistoryService targetHistoryService;

    public DailyEntryService(DailyEntryRepository dailyEntryRepository, GoalService goalService, Clock clock, TargetHistoryService targetHistoryService) {
        this.dailyEntryRepository = dailyEntryRepository;
        this.goalService = goalService;
        this.clock = clock;
        this.targetHistoryService = targetHistoryService;
    }

    @Transactional(readOnly = true)
    public List<DailyEntry> getEntriesByGoalId(Long goalId) {
        return dailyEntryRepository.findByGoalIdOrderByEntryDate(goalId);
    }

    @Transactional(readOnly = true)
    public List<DailyEntry> getAllEntries() {
        return dailyEntryRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<DailyEntry> getEntriesFrom(LocalDate from) {
        if (from == null) {
            return dailyEntryRepository.findAll();
        }
        return dailyEntryRepository.findByEntryDateGreaterThanEqualOrderByEntryDate(from);
    }

    @Transactional(readOnly = true)
    public Optional<DailyEntry> getEntryById(Long id) {
        return dailyEntryRepository.findById(id);
    }

    @Transactional
    public DailyEntry createDailyEntry(DailyEntry entry) {
        if (entry.getEntryDate().isAfter(LocalDate.now(clock))) {
            throw new IllegalArgumentException("Entry date must not be in the future");
        }
        if (goalService.getGoalById(entry.getGoalId()).isEmpty()) {
            throw new GoalNotFoundException(entry.getGoalId());
        }
        BigDecimal effectiveTarget = targetHistoryService.getEffectiveTarget(entry.getGoalId(), entry.getEntryDate());
        entry.setTargetValue(effectiveTarget);

        return dailyEntryRepository.save(entry);
    }

    @Transactional
    public DailyEntry updateDailyEntry(DailyEntry entry) {
        if (entry.getEntryDate().isAfter(LocalDate.now(clock))) {
            throw new IllegalArgumentException("Entry date must not be in the future");
        }
        Long goalId = entry.getGoalId();
        if (goalService.getGoalById(goalId).isEmpty()) {
            throw new GoalNotFoundException(goalId);
        }
        BigDecimal effectiveTarget = targetHistoryService.getEffectiveTarget(goalId, entry.getEntryDate());
        entry.setTargetValue(effectiveTarget);

        return dailyEntryRepository.save(entry);
    }

    @Transactional
    public void deleteDailyEntry(Long id) {
        DailyEntry entry = dailyEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Daily entry not found with id: " + id));

        dailyEntryRepository.delete(entry);
    }
}
