package org.techkinglabs.repository;

import org.techkinglabs.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {
    List<Goal> findByIsActiveTrue();

    List<Goal> findByIsActiveFalse();
}