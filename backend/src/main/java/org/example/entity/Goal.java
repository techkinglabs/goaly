package org.example.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "goals")
@Data
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

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "description")
    private String description;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @Column(name = "day_of_week")
    private List<String> daysOfWeek;
}