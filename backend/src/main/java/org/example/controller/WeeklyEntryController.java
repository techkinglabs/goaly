package org.example.controller;

import jakarta.validation.Valid;
import org.example.dto.WeeklyEntryRequest;
import org.example.dto.WeeklyEntryResponse;
import org.example.entity.WeeklyEntry;
import org.example.exception.ResourceNotFoundException;
import org.example.mapper.WeeklyEntryMapper;
import org.example.service.WeeklyEntryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/entries")
@Validated
public class WeeklyEntryController {
    
    @Autowired
    private WeeklyEntryService weeklyEntryService;
    
    @GetMapping
    public List<WeeklyEntryResponse> getAllEntries(@RequestParam(required = false) Long goalId) {
        if (goalId != null) {
            return weeklyEntryService.getEntriesByGoalId(goalId).stream()
                    .map(WeeklyEntryMapper::toResponse)
                    .collect(Collectors.toList());
        }
        return weeklyEntryService.getAllEntries().stream()
                .map(WeeklyEntryMapper::toResponse)
                .collect(Collectors.toList());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<WeeklyEntryResponse> getEntryById(@PathVariable Long id) {
        return weeklyEntryService.getEntryById(id)
                .map(entry -> ResponseEntity.ok(WeeklyEntryMapper.toResponse(entry)))
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<WeeklyEntryResponse> createEntry(@Valid @RequestBody WeeklyEntryRequest request) {
        WeeklyEntry entry = WeeklyEntryMapper.toEntity(request);
        WeeklyEntry createdEntry = weeklyEntryService.createWeeklyEntry(entry);
        return ResponseEntity.status(201).body(WeeklyEntryMapper.toResponse(createdEntry));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<WeeklyEntryResponse> updateEntry(@PathVariable Long id, @Valid @RequestBody WeeklyEntryRequest request) {
        WeeklyEntry entry = weeklyEntryService.getEntryById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entry not found with id: " + id));
        WeeklyEntryMapper.updateEntityFromRequest(request, entry);
        WeeklyEntry updatedEntry = weeklyEntryService.updateWeeklyEntryInDb(entry);
        return ResponseEntity.ok(WeeklyEntryMapper.toResponse(updatedEntry));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEntry(@PathVariable Long id) {
        weeklyEntryService.deleteWeeklyEntry(id);
        return ResponseEntity.noContent().build();
    }
}
