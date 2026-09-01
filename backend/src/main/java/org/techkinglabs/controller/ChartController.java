package org.techkinglabs.controller;

import org.techkinglabs.dto.ChartDataPoint;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.exception.ResourceNotFoundException;
import org.techkinglabs.repository.GoalRepository;
import org.techkinglabs.service.ChartDataService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/chart")
public class ChartController {

    private static final Set<String> ALLOWED_RANGES =
            Set.of("7d", "30d", "365d", "week", "year", "all");

    private final ChartDataService chartDataService;
    private final GoalRepository goalRepository;

    public ChartController(ChartDataService chartDataService, GoalRepository goalRepository) {
        this.chartDataService = chartDataService;
        this.goalRepository = goalRepository;
    }

    @GetMapping("/data")
    public List<ChartDataPoint> getChartData(
            @RequestParam(required = false) Long goalId,
            @RequestParam(required = false, defaultValue = "all") String range,
            @RequestParam(required = false) LocalDate anchor) {
        if (!ALLOWED_RANGES.contains(range == null ? "" : range.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid range '" + range + "'. Allowed: 7d, 30d, 365d, week, year, all");
        }
        if (anchor != null && anchor.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "anchor must not be in the future");
        }
        String normalizedRange = range == null ? null : range.toLowerCase();

        if (goalId != null) {
            Goal goal = goalRepository.findById(goalId)
                    .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + goalId));
            return chartDataService.getChartDataForGoal(goal, normalizedRange, anchor);
        }

        return chartDataService.getChartDataForAllGoals(normalizedRange, anchor);
    }
}
