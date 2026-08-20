package org.example.repository;

import org.example.entity.WeeklyEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WeeklyEntryRepository extends JpaRepository<WeeklyEntry, Long> {
    List<WeeklyEntry> findByGoalIdOrderByWeekStartDate(Long goalId);
}