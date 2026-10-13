package org.techkinglabs.repository;

import org.techkinglabs.dto.DailyEntryChartView;
import org.techkinglabs.entity.DailyEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DailyEntryRepository extends JpaRepository<DailyEntry, Long> {
    List<DailyEntry> findByGoalIdOrderByEntryDate(Long goalId);

    @Modifying
    @Query("delete from DailyEntry d where d.goalId = :goalId")
    void deleteByGoalId(Long goalId);

    List<DailyEntry> findByEntryDateGreaterThanEqualOrderByEntryDate(LocalDate from);

    List<DailyEntry> findByGoalIdInOrderByEntryDate(List<Long> goalIds);

    List<DailyEntry> findByGoalIdInAndEntryDateGreaterThanEqualOrderByEntryDate(List<Long> goalIds, LocalDate from);

    List<DailyEntry> findByGoalIdAndEntryDateGreaterThanEqualOrderByEntryDate(Long goalId, LocalDate from);

    @Query("SELECT MIN(d.entryDate) FROM DailyEntry d WHERE d.goalId = :goalId")
    LocalDate findMinEntryDateByGoalId(@Param("goalId") Long goalId);

    @SuppressWarnings("JpaDataSourceORMInspection")
    @Query(value = """
            SELECT gs::date AS entryDate,
                   COALESCE(SUM(de.actual_value), CAST(0 AS NUMERIC)) AS actualValue
            FROM generate_series(CAST(:from AS date), CAST(:to AS date), '1 day'::interval) gs
            LEFT JOIN daily_entries de
                   ON de.goal_id = :goalId
                   AND de.entry_date = gs::date
            GROUP BY gs
            ORDER BY gs
            """, nativeQuery = true)
    List<DailyEntryChartView> findChartDataByGoalIdAndDateBetween(
            @Param("goalId") Long goalId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
