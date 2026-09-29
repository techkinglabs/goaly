package org.techkinglabs.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.repository.GoalRepository;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.techkinglabs.entity.TargetHistory;
import org.techkinglabs.model.Period;
import org.techkinglabs.repository.TargetHistoryRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class TargetHistoryRepositoryIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres =
            new PostgreSQLContainer("postgres:17");

    private final TargetHistoryRepository targetHistoryRepository;
    private final GoalRepository goalRepository;

    @Autowired
    TargetHistoryRepositoryIntegrationTest(TargetHistoryRepository targetHistoryRepository, GoalRepository goalRepository) {
        this.targetHistoryRepository = targetHistoryRepository;
        this.goalRepository = goalRepository;
    }

    @Test
    void shouldRejectDuplicateGoalAndValidFrom() {
        Goal goal = new Goal();
        goal.setName("test");
        goal.setDescription("desc");
        goal.setAmountPerPeriod(BigDecimal.TWO);
        goal.setTargetValue(BigDecimal.TEN);
        goal.setUnit("test_unit");
        goal.setActive(true);

        Goal savedGoal = goalRepository.saveAndFlush(goal);

        TargetHistory first = new TargetHistory();
        first.setGoalId(savedGoal.getId());
        first.setValidFrom(LocalDate.of(2026, 9, 28));
        first.setPeriod(Period.WEEK);
        first.setValue(BigDecimal.TEN);

        targetHistoryRepository.saveAndFlush(first);

        TargetHistory duplicate = new TargetHistory();
        duplicate.setGoalId(savedGoal.getId());
        duplicate.setValidFrom(LocalDate.of(2026, 9, 28));
        duplicate.setPeriod(Period.WEEK);
        duplicate.setValue(BigDecimal.valueOf(20));

        assertThatThrownBy(() -> targetHistoryRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}