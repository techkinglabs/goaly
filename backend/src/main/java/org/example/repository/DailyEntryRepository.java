package org.example.repository;

import org.example.entity.DailyEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DailyEntryRepository extends JpaRepository<DailyEntry, Long> {
    List<DailyEntry> findByGoalIdOrderByEntryDate(Long goalId);

    boolean existsByGoalIdAndEntryDate(Long goalId, LocalDate entryDate);

    boolean existsByGoalIdAndEntryDateAndIdNot(Long goalId, LocalDate entryDate, Long id);

    void deleteByGoalId(Long goalId);
}
