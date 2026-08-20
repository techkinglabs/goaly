package org.example.controller;

import org.example.service.ChartDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chart")
public class ChartController {
    
    @Autowired
    private ChartDataService chartDataService;
    
    @GetMapping("/data")
    public List<Map<String, Object>> getChartData(@RequestParam(required = false) Long goalId) {
        if (goalId != null) {
            return chartDataService.getChartDataForGoal(goalId);
        }
        // Return data for all goals - this will need to be implemented
        return chartDataService.getChartDataForAllGoals();
    }
}