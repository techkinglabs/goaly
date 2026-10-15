package org.techkinglabs.controller;

import org.techkinglabs.dto.ChartDataPoint;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.exception.GoalNotFoundException;
import org.techkinglabs.service.ChartDataService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.techkinglabs.service.GoalService;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/chart")
public class ChartController {

    private static final Set<String> ALLOWED_RANGES =
            Set.of("7d", "30d", "365d", "week", "year", "all");

    private final ChartDataService chartDataService;
    private final GoalService goalService;
    private final Clock clock;

    public ChartController(ChartDataService chartDataService, GoalService goalService, Clock clock) {
        this.chartDataService = chartDataService;
        this.goalService = goalService;
        this.clock = clock;
    }

    private void validateRange(String range) {
        if (!ALLOWED_RANGES.contains(range == null ? "" : range.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid range '" + range + "'. Allowed: 7d, 30d, 365d, week, year, all");
        }
    }

    private void validateAnchor(LocalDate anchor) {
        // Allow the anchor up to one day in the future relative to server time:
        // the frontend sends the user's local `today`, which can legitimately be
        // "tomorrow" from the server's UTC perspective.
        if (anchor != null && anchor.isAfter(LocalDate.now(clock).plusDays(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "anchor must not be in the future");
        }
    }

    @GetMapping("/data")
    public List<ChartDataPoint> getChartData(
            @RequestParam(required = false) Long goalId,
            @RequestParam(required = false, defaultValue = "all") String range,
            @RequestParam(required = false) LocalDate anchor) {
        validateRange(range);
        validateAnchor(anchor);
        String normalizedRange = range == null ? null : range.toLowerCase();

        if (goalId != null) {
            Goal goal = goalService.getGoalById(goalId)
                    .orElseThrow(() -> new GoalNotFoundException(goalId));
            return chartDataService.getChartDataForGoal(goal, normalizedRange, anchor);
        }

        return chartDataService.getChartDataForAllGoals(normalizedRange, anchor);
    }

    @GetMapping("/data/{goalId}")
    public List<ChartDataPoint> getChartDataForGoal(
            @PathVariable Long goalId,
            @RequestParam(required = false, defaultValue = "all") String range,
            @RequestParam(required = false) LocalDate anchor) {
        validateRange(range);
        validateAnchor(anchor);
        String normalizedRange = range == null ? null : range.toLowerCase();
        Goal goal = goalService.getGoalById(goalId)
                .orElseThrow(() -> new GoalNotFoundException(goalId));
        return chartDataService.getChartDataForGoal(goal, normalizedRange, anchor);
    }
}
