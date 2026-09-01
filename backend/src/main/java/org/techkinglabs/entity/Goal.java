package org.techkinglabs.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.techkinglabs.model.Period;
import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "goals")
@NoArgsConstructor
@AllArgsConstructor
public class Goal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @NotBlank(message = "Name is required")
    private String name;

    @Column(nullable = false)
    @NotBlank(message = "Unit is required")
    private String unit;

    @Column(name = "target_value", nullable = false)
    @NotNull(message = "Target value is required")
    private BigDecimal targetValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "period", nullable = false)
    private Period period = Period.WEEK;

    @Column(name = "amount_per_period", nullable = false)
    private BigDecimal amountPerPeriod = BigDecimal.ZERO;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "description")
    private String description;
}