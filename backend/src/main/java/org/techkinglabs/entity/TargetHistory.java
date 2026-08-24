package org.techkinglabs.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "target_history", uniqueConstraints = @UniqueConstraint(
        name = "uk_target_history_goal_date",
        columnNames = {"goal_id", "valid_from"}
))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TargetHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "goal_id", nullable = false)
    private Long goalId;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "period", nullable = false)
    private String period = "WEEK";

    @Column(name = "value", nullable = false)
    private BigDecimal value;
}
