package org.techkinglabs.repository;

import org.techkinglabs.entity.DailyEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DailyEntryRepository extends JpaRepository<DailyEntry, Long> {
    List<DailyEntry> findByGoalIdOrderByEntryDate(Long goalId);

    boolean existsByGoalIdAndEntryDate(Long goalId, LocalDate entryDate);

    boolean existsByGoalIdAndEntryDateAndIdNot(Long goalId, LocalDate entryDate, Long id);

    @Modifying
    @Query("delete from DailyEntry d where d.goalId = :goalId")
    void deleteByGoalId(Long goalId);

    List<DailyEntry> findByEntryDateGreaterThanEqualOrderByEntryDate(LocalDate from);
}
