package org.techkinglabs;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@Component
public class SchemaMigrationRunner {

    private final DataSource dataSource;

    public SchemaMigrationRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostConstruct
    public void migrate() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            // Allow multiple daily entries per goal on the same date.
            // The chart aggregates them by summing per day.
            stmt.execute("ALTER TABLE daily_entries DROP CONSTRAINT IF EXISTS uk_daily_entry_goal_date");
        } catch (Exception e) {
            // Non-fatal: constraint may not exist (e.g. fresh DB created without it).
            System.out.println("Schema migration skipped/already applied: " + e.getMessage());
        }
    }
}
