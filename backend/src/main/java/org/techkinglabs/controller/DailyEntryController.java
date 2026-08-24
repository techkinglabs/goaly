package org.techkinglabs.controller;

import jakarta.validation.Valid;
import org.techkinglabs.dto.DailyEntryRequest;
import org.techkinglabs.dto.DailyEntryResponse;
import org.techkinglabs.entity.DailyEntry;
import org.techkinglabs.exception.ResourceNotFoundException;
import org.techkinglabs.mapper.DailyEntryMapper;
import org.techkinglabs.service.DailyEntryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/entries")
@Validated
public class DailyEntryController {

    private final DailyEntryService dailyEntryService;

    public DailyEntryController(DailyEntryService dailyEntryService) {
        this.dailyEntryService = dailyEntryService;
    }

    @GetMapping
    public List<DailyEntryResponse> getAllEntries(@RequestParam(required = false) Long goalId) {
        if (goalId != null) {
            return dailyEntryService.getEntriesByGoalId(goalId).stream()
                    .map(DailyEntryMapper::toResponse)
                    .collect(Collectors.toList());
        }
        return dailyEntryService.getAllEntries().stream()
                .map(DailyEntryMapper::toResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DailyEntryResponse> getEntryById(@PathVariable Long id) {
        return dailyEntryService.getEntryById(id)
                .map(entry -> ResponseEntity.ok(DailyEntryMapper.toResponse(entry)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<DailyEntryResponse> createEntry(@Valid @RequestBody DailyEntryRequest request) {
        DailyEntry entry = DailyEntryMapper.toEntity(request);
        DailyEntry createdEntry = dailyEntryService.createDailyEntry(entry);
        return ResponseEntity.status(201).body(DailyEntryMapper.toResponse(createdEntry));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DailyEntryResponse> updateEntry(@PathVariable Long id, @Valid @RequestBody DailyEntryRequest request) {
        DailyEntry entry = dailyEntryService.getEntryById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entry not found with id: " + id));
        DailyEntryMapper.updateEntityFromRequest(request, entry);
        DailyEntry updatedEntry = dailyEntryService.updateDailyEntryInDb(entry);
        return ResponseEntity.ok(DailyEntryMapper.toResponse(updatedEntry));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEntry(@PathVariable Long id) {
        dailyEntryService.deleteDailyEntry(id);
        return ResponseEntity.noContent().build();
    }
}
