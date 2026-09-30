package org.techkinglabs.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.service.GoalService;
import org.techkinglabs.service.TargetHistoryService;

import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class GoalControllerValidationTest {

    @Test
    void validationErrorShouldReturn400BadRequestNot500InternalServerError() throws Exception {
        GoalService goalService = mock(GoalService.class);
        TargetHistoryService targetHistoryService = mock(TargetHistoryService.class);
        GoalController controller = new GoalController(goalService,targetHistoryService);

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new org.springframework.http.converter.json.JacksonJsonHttpMessageConverter())
                .build();

        MvcResult result = mockMvc.perform(post("/api/goals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    void validRequestShouldReturn201Created() throws Exception {
        GoalService goalService = mock(GoalService.class);
        TargetHistoryService targetHistoryService = mock(TargetHistoryService.class);
        GoalController controller = new GoalController(goalService,targetHistoryService);

        Goal createdGoal = new Goal();
        createdGoal.setId(1L);
        createdGoal.setName("Sleep at 23:00");
        createdGoal.setUnit("hours");
        when(goalService.createGoal(any(Goal.class), any(), any())).thenReturn(createdGoal);
        when(targetHistoryService.getTargetHistory(1L)).thenReturn(List.of());

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new org.springframework.http.converter.json.JacksonJsonHttpMessageConverter())
                .build();

        String validJson = """
                {
                    "name": "Sleep at 23:00",
                    "unit": "hours",
                    "active": false
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/goals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson))
                .andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(201);
    }
}