package org.techkinglabs.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.techkinglabs.entity.Goal;
import org.techkinglabs.model.Period;
import org.techkinglabs.service.GoalService;
import java.math.BigDecimal;
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
        GoalController controller = new GoalController(goalService);

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
        GoalController controller = new GoalController(goalService);

        Goal createdGoal = new Goal();
        createdGoal.setId(1L);
        createdGoal.setName("Sleep at 23:00");
        createdGoal.setUnit("hours");
        createdGoal.setTargetValue(new BigDecimal("8"));
        createdGoal.setAmountPerPeriod(new BigDecimal("8"));
        createdGoal.setPeriod(Period.WEEK);
        when(goalService.createGoal(any(Goal.class))).thenReturn(createdGoal);
        when(goalService.getTargetHistory(1L)).thenReturn(List.of());

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new org.springframework.http.converter.json.JacksonJsonHttpMessageConverter())
                .build();

        String validJson = """
                {
                    "name": "Sleep at 23:00",
                    "unit": "hours",
                    "targetValue": 8,
                    "amountPerPeriod": 8,
                    "period": "WEEK"
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/goals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson))
                .andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(201);
    }
}