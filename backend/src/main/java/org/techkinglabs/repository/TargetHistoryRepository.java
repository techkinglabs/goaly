package org.techkinglabs.repository;

import org.techkinglabs.entity.TargetHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TargetHistoryRepository extends JpaRepository<TargetHistory, Long> {
    List<TargetHistory> findByGoalIdOrderByValidFromAsc(Long goalId);

    Optional<TargetHistory> findFirstByGoalIdAndValidFromLessThanEqualOrderByValidFromDesc(Long goalId, LocalDate date);

    Optional<TargetHistory> findFirstByGoalIdAndValidFromLessThanOrderByValidFromDesc(Long goalId, LocalDate date);
}
