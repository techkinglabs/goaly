package org.example.controller;

import org.example.entity.WeeklyEntry;
import org.example.service.WeeklyEntryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/entries")
public class WeeklyEntryController {
    
    @Autowired
    private WeeklyEntryService weeklyEntryService;
    
    @GetMapping
    public List<WeeklyEntry> getAllEntries(@RequestParam(required = false) Long goalId) {
        if (goalId != null) {
            return weeklyEntryService.getEntriesByGoalId(goalId);
        }
        // Return all entries
        return weeklyEntryService.getAllEntries();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<WeeklyEntry> getEntryById(@PathVariable Long id) {
        Optional<WeeklyEntry> entry = weeklyEntryService.getEntryById(id);
        return entry.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public WeeklyEntry createEntry(@RequestBody WeeklyEntry entry) {
        return weeklyEntryService.createWeeklyEntry(entry);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<WeeklyEntry> updateEntry(@PathVariable Long id, @RequestBody WeeklyEntry entryDetails) {
        try {
            WeeklyEntry updatedEntry = weeklyEntryService.updateWeeklyEntry(id, entryDetails);
            return ResponseEntity.ok(updatedEntry);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEntry(@PathVariable Long id) {
        try {
            weeklyEntryService.deleteWeeklyEntry(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}