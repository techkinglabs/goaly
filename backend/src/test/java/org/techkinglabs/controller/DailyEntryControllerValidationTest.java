package org.techkinglabs.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.techkinglabs.entity.DailyEntry;
import org.techkinglabs.exception.ResourceNotFoundException;
import org.techkinglabs.service.DailyEntryService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DailyEntryControllerValidationTest {

    MockMvc mockMvc;

    DailyEntryService dailyEntryService;

    @BeforeEach
    void setUp() {
        dailyEntryService = mock(DailyEntryService.class);
        DailyEntryController controller = new DailyEntryController(dailyEntryService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new JacksonJsonHttpMessageConverter())
                .build();
    }

    @Test
    void createDailyEntryShouldReturn201Created() throws Exception {
        DailyEntry dailyEntry = createDailyEntry();

        when(dailyEntryService.createDailyEntry(any(DailyEntry.class)))
                .thenReturn(dailyEntry);

        String validJson = """
                {
                    "goalId": 1,
                    "entryDate": "2026-09-23",
                    "actualValue": 1
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.entryDate").value("2026-09-23"))
                .andExpect(jsonPath("$.actualValue").value(1))
                .andReturn();

        verify(dailyEntryService)
                .createDailyEntry(argThat(e ->
                        e.getActualValue().equals(BigDecimal.ONE)));

        assertThat(result.getResponse().getStatus()).isEqualTo(201);
    }

    @Test
    void getDailyEntryShouldReturn404WhenNotFound() throws Exception {
        when(dailyEntryService.getEntryById(anyLong()))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/entries/20"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createDailyEntryShouldReturn400ForInvalidRequest() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    void createDailyEntryShouldReturn404WhenGoalDoesNotExist() throws Exception {
        when(dailyEntryService.createDailyEntry(any(DailyEntry.class)))
                .thenThrow(new ResourceNotFoundException("Goal not found"));

        String json = """
                {
                    "goalId": 20,
                    "entryDate": "2026-09-28",
                    "actualValue": 10
                }
                """;

        mockMvc.perform(post("/api/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isNotFound());

        verify(dailyEntryService)
                .createDailyEntry(any(DailyEntry.class));
    }

    @Test
    void updateDailyEntryShouldReturn404WhenGoalDoesNotExist() throws Exception {
        DailyEntry dailyEntry = createDailyEntry();

        when(dailyEntryService.getEntryById(1L))
                .thenReturn(Optional.of(dailyEntry));

        when(dailyEntryService.updateDailyEntry(any(DailyEntry.class)))
                .thenThrow(new ResourceNotFoundException("Goal not found"));

        String json = """
                {
                    "goalId": 20,
                    "actualValue": 10,
                    "note": "updated note",
                    "entryDate": "2026-09-23"
                }
                """;

        mockMvc.perform(put("/api/entries/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isNotFound());
    }

    @Test
    void getDailyEntryShouldReturn200WhenFound() throws Exception {
        DailyEntry dailyEntry = createDailyEntry();

        when(dailyEntryService.getEntryById(1L))
                .thenReturn(Optional.of(dailyEntry));

        mockMvc.perform(get("/api/entries/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.entryDate").value("2026-09-23"))
                .andExpect(jsonPath("$.actualValue").value(1));

        verify(dailyEntryService).getEntryById(1L);
    }

    @Test
    void getAllDailyEntriesShouldReturn200() throws Exception {
        DailyEntry entry1 = createDailyEntry();

        DailyEntry entry2 = createDailyEntry();
        entry2.setId(2L);
        entry2.setActualValue(BigDecimal.TEN);
        entry2.setEntryDate(LocalDate.of(2026, 9, 22));

        when(dailyEntryService.getAllEntries())
                .thenReturn(List.of(entry1, entry2));

        mockMvc.perform(get("/api/entries"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[1].id").value(2));

        verify(dailyEntryService).getAllEntries();
    }

    @Test
    void updateDailyEntryShouldReturn200() throws Exception {
        DailyEntry existingEntry = createDailyEntry();

        when(dailyEntryService.getEntryById(1L))
                .thenReturn(Optional.of(existingEntry));

        DailyEntry updatedEntry = createDailyEntry();
        updatedEntry.setActualValue(BigDecimal.TEN);
        updatedEntry.setNote("updated note");

        when(dailyEntryService.updateDailyEntry(any(DailyEntry.class)))
                .thenReturn(updatedEntry);

        String updateJson = """
                {
                    "goalId": 1,
                    "actualValue": 10,
                    "note": "updated note",
                    "entryDate": "2026-09-23"
                }
                """;

        mockMvc.perform(put("/api/entries/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.note").value("updated note"))
                .andExpect(jsonPath("$.actualValue").value(10));

        verify(dailyEntryService).getEntryById(1L);
        verify(dailyEntryService).updateDailyEntry(any(DailyEntry.class));
    }

    @Test
    void deleteDailyEntryShouldReturn204WhenExists() throws Exception {
        doNothing().when(dailyEntryService).deleteDailyEntry(1L);

        mockMvc.perform(delete("/api/entries/1"))
                .andExpect(status().isNoContent());

        verify(dailyEntryService).deleteDailyEntry(1L);
    }

    @Test
    void deleteDailyEntryShouldReturn404WhenNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Entry not found with id: 999"))
                .when(dailyEntryService).deleteDailyEntry(999L);

        mockMvc.perform(delete("/api/entries/999"))
                .andExpect(status().isNotFound());

        verify(dailyEntryService).deleteDailyEntry(999L);
    }

    private DailyEntry createDailyEntry() {
        DailyEntry dailyEntry = new DailyEntry();
        dailyEntry.setId(1L);
        dailyEntry.setGoalId(1L);
        dailyEntry.setTargetValue(BigDecimal.ONE);
        dailyEntry.setNote("note");
        dailyEntry.setActualValue(BigDecimal.ONE);
        dailyEntry.setEntryDate(LocalDate.of(2026, 9, 23));
        return dailyEntry;
    }
}