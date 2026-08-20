package org.example.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "weekly_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "goal_id", nullable = false)
    private Long goalId;

    @Column(name = "week_start_date", nullable = false)
    private LocalDate weekStartDate;

    @Column(name = "actual_value", nullable = false)
    private BigDecimal actualValue;

    @Column(name = "target_value", nullable = false)
    private BigDecimal targetValue;
}