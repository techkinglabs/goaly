package org.techkinglabs.repository;

import org.techkinglabs.entity.TargetHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TargetHistoryRepository extends JpaRepository<TargetHistory, Long> {
    List<TargetHistory> findByGoalIdOrderByValidFromAsc(Long goalId);

    Optional<TargetHistory> findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(Long goalId, LocalDate date);

    Optional<TargetHistory> findFirstByGoalIdAndValidFromLessThanOrderByValidFromDesc(Long goalId, LocalDate date);

    @Query("select h from TargetHistory h where h.goalId = :goalId and (:excludeId is null or h.id <> :excludeId) and h.validFrom <= :date and (h.validTo is null or h.validTo >= :date) order by h.validFrom desc")
    Optional<TargetHistory> findOverlapping(Long goalId, LocalDate date, Long excludeId);

    @Modifying
    @Query("delete from TargetHistory h where h.goalId = :goalId")
    void deleteByGoalId(Long goalId);

    List<TargetHistory> findByGoalIdInOrderByGoalIdAscValidFromAsc(List<Long> goalIds);

    Optional<TargetHistory> findFirstByGoalIdAndValidFromGreaterThanOrderByValidFromAsc(Long goalId, LocalDate validFrom);
}
