package org.example.controller;

import org.example.dto.ChartDataResponse;
import org.example.service.ChartDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chart")
public class ChartController {

    @Autowired
    private ChartDataService chartDataService;

    @GetMapping("/data")
    public List<ChartDataResponse> getChartData(
            @RequestParam(required = false) Long goalId,
            @RequestParam(required = false, defaultValue = "all") String range,
            @RequestParam(required = false) LocalDate anchor) {
        if (goalId != null) {
            return chartDataService.getChartDataForGoal(goalId, range, anchor).stream()
                    .map(data -> toResponse(data))
                    .collect(Collectors.toList());
        }

        return chartDataService.getChartDataForAllGoals(range, anchor).stream()
                .map(data -> toResponse(data))
                .collect(Collectors.toList());
    }

    private ChartDataResponse toResponse(Map<String, Object> data) {
        String label = data.containsKey("weekStart")
                ? (String) data.get("weekStart")
                : (String) data.get("entryDate");
        Map<String, Double> goals = data.entrySet().stream()
                .filter(e -> e.getKey().startsWith("goal_"))
                .collect(Collectors.toMap(Map.Entry::getKey, e -> (Double) e.getValue()));
        Map<String, Double> totals = data.entrySet().stream()
                .filter(e -> e.getKey().startsWith("total_"))
                .collect(Collectors.toMap(Map.Entry::getKey, e -> (Double) e.getValue()));
        return new ChartDataResponse(label, goals, totals);
    }
}
