package org.example.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "daily_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "goal_id", nullable = false)
    @NotNull(message = "Goal ID is required")
    private Long goalId;

    @Column(name = "entry_date", nullable = false)
    @NotNull(message = "Entry date is required")
    private LocalDate entryDate;

    @Column(name = "actual_value", nullable = false)
    @NotNull(message = "Actual value is required")
    private BigDecimal actualValue;

    @Column(name = "target_value", nullable = false)
    @NotNull(message = "Target value is required")
    private BigDecimal targetValue;

    @Column(name = "note", length = 1000)
    private String note;
}
