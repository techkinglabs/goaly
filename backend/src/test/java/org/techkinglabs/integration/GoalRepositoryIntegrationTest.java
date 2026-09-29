package org.techkinglabs.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.repository.GoalRepository;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class GoalRepositoryIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres =
            new PostgreSQLContainer("postgres:17");

    private final GoalRepository goalRepository;

    @Autowired
    GoalRepositoryIntegrationTest(GoalRepository goalRepository) {
        this.goalRepository = goalRepository;
    }

    @Test
    void shouldSaveAndRetrieveGoal() {
        Goal goal = new Goal();
        goal.setName("test");
        goal.setDescription("desc");
        goal.setAmountPerPeriod(BigDecimal.TWO);
        goal.setTargetValue(BigDecimal.TEN);
        goal.setUnit("test_unit");
        goal.setActive(true);

        Goal savedGoal = goalRepository.save(goal);

        assertThat(savedGoal.getId()).isNotNull();

        Goal foundGoal = goalRepository.findById(savedGoal.getId())
                .orElseThrow();

        assertThat(foundGoal.getName()).isEqualTo("test");
        assertThat(foundGoal.getDescription()).isEqualTo("desc");
        assertThat(foundGoal.getAmountPerPeriod()).isEqualByComparingTo(BigDecimal.TWO);
        assertThat(foundGoal.getTargetValue()).isEqualByComparingTo(BigDecimal.TEN);
        assertThat(foundGoal.getUnit()).isEqualTo("test_unit");
        assertThat(foundGoal.isActive()).isTrue();
    }
}