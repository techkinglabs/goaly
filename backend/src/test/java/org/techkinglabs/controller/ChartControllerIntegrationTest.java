package org.techkinglabs.controller;

import org.junit.jupiter.api.Test;
import org.springframework.format.support.DefaultFormattingConversionService;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test for {@link ChartController} error handling.
 *
 * <p>Standalone MockMvc is built around the real controller with the production
 * {@code @ControllerAdvice} ({@link GlobalExceptionHandler}) attached via
 * {@code setControllerAdvice}. This mirrors the resolver chain of a running
 * Spring MVC application: advice-based resolvers are consulted before the
 * framework's built-in ResponseStatusExceptionResolver. The assertions therefore
 * prove that a controller-thrown ResponseStatusException(BAD_REQUEST) yields
 * HTTP 400 instead of being swallowed by the generic catch-all handler and
 * turned into HTTP 500.</p>
 */
class ChartControllerIntegrationTest {

    private final org.techkinglabs.service.ChartDataService chartDataService =
            mock(org.techkinglabs.service.ChartDataService.class);

    @Test
    void invalidRangeShouldReturn400BadRequestNot500InternalServerError() throws Exception {
        MvcResult result = buildMockMvc()
                .perform(get("/api/chart/data").param("range", "13d"))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    void futureAnchorWithoutGoalIdShouldReturn400BadRequestNot500InternalServerError() throws Exception {
        // 2 days ahead — beyond the +1 day tolerance for client/server timezone drift.
        String futureDate = LocalDate.now(java.time.ZoneOffset.UTC).plusDays(2).toString();

        buildMockMvc().perform(get("/api/chart/data").param("range", "30d").param("anchor", futureDate))
                .andDo(print())
                .andExpect(status().isBadRequest());
    }

    @Test
    void futureAnchorDefaultRangeShouldReturn400BadRequestNot500InternalServerError() throws Exception {
        String futureDate = LocalDate.now(java.time.ZoneOffset.UTC).plusDays(2).toString();

        buildMockMvc().perform(get("/api/chart/data").param("anchor", futureDate))
                .andDo(print())
                .andExpect(status().isBadRequest());
    }

    @Test
    void tomorrowAnchorIsAcceptedForClientTimezoneDrift() throws Exception {
        when(chartDataService.getChartDataForAllGoals(anyString(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(java.util.List.of());
        // Client-local "today" can be up to 1 day ahead of server UTC; must not be rejected.
        String tomorrow = LocalDate.now(java.time.ZoneOffset.UTC).plusDays(1).toString();

        buildMockMvc().perform(get("/api/chart/data").param("range", "30d").param("anchor", tomorrow))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    void validRequestShouldReturn200WithChartData() throws Exception {
        when(chartDataService.getChartDataForAllGoals(anyString(), org.mockito.ArgumentMatchers.isNull()))
                .thenReturn(java.util.List.of());

        buildMockMvc().perform(get("/api/chart/data").param("range", "30d"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    private MockMvc buildMockMvc() {
        org.techkinglabs.service.GoalService goalService =
                mock(org.techkinglabs.service.GoalService.class);
        Clock clock = Clock.system(ZoneId.of("UTC"));
        ChartController controller = new ChartController(chartDataService, goalService, clock);

        return MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setConversionService(new DefaultFormattingConversionService())
                .setMessageConverters(new JacksonJsonHttpMessageConverter())
                .build();
    }
}
