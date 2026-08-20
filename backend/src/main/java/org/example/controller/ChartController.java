package org.example.controller;

import org.example.dto.ChartDataResponse;
import org.example.service.ChartDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chart")
public class ChartController {
    
    @Autowired
    private ChartDataService chartDataService;
    
    @GetMapping("/data")
    public List<ChartDataResponse> getChartData(@RequestParam(required = false) Long goalId) {
        if (goalId != null) {
            return chartDataService.getChartDataForGoal(goalId).stream()
                    .map(data -> new ChartDataResponse(
                            (String) data.get("weekStart"),
                            data.entrySet().stream()
                                    .filter(e -> e.getKey().startsWith("goal_"))
                                    .collect(Collectors.toMap(
                                            Map.Entry::getKey,
                                            e -> (Double) e.getValue()
                                    )),
                            data.entrySet().stream()
                                    .filter(e -> e.getKey().startsWith("total_"))
                                    .collect(Collectors.toMap(
                                            Map.Entry::getKey,
                                            e -> (Double) e.getValue()
                                    ))
                    ))
                    .collect(Collectors.toList());
        }

        return chartDataService.getChartDataForAllGoals().stream()
                .map(data -> new ChartDataResponse(
                        (String) data.get("weekStart"),
                        data.entrySet().stream()
                                .filter(e -> e.getKey().startsWith("goal_"))
                                .collect(Collectors.toMap(
                                        Map.Entry::getKey,
                                        e -> (Double) e.getValue()
                                )),
                        data.entrySet().stream()
                                .filter(e -> e.getKey().startsWith("total_"))
                                .collect(Collectors.toMap(
                                        Map.Entry::getKey,
                                        e -> (Double) e.getValue()
                                ))
                ))
                .collect(Collectors.toList());
    }
}
