package org.example.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "weekly_entries", uniqueConstraints = @UniqueConstraint(
        name = "uk_weekly_entry_goal_week",
        columnNames = {"goal_id", "week_start_date"}
))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "goal_id", nullable = false)
    @NotNull(message = "Goal ID is required")
    private Long goalId;

    @Column(name = "week_start_date", nullable = false)
    @NotNull(message = "Week start date is required")
    private LocalDate weekStartDate;

    @Column(name = "actual_value", nullable = false)
    @NotNull(message = "Actual value is required")
    private BigDecimal actualValue;

    @Column(name = "target_value", nullable = false)
    @NotNull(message = "Target value is required")
    private BigDecimal targetValue;
}