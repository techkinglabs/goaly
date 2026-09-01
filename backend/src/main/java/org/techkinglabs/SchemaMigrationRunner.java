package org.techkinglabs;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

@Component
public class SchemaMigrationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaMigrationRunner.class);
    private static final String CONSTRAINT_NAME = "uk_daily_entry_goal_date";
    private static final String TABLE_NAME = "daily_entries";
    private final DataSource dataSource;

    public SchemaMigrationRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostConstruct
    public void migrate() {
        try (Connection conn = dataSource.getConnection()) {
            if (constraintExists(conn, TABLE_NAME, CONSTRAINT_NAME)) {
                // Allow multiple daily entries per goal on the same date.
                // The chart aggregates them by summing per day.
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE " + TABLE_NAME + " DROP CONSTRAINT " + CONSTRAINT_NAME);
                }
                log.info("Dropped constraint {} from {}", CONSTRAINT_NAME, TABLE_NAME);
            } else {
                log.info("Constraint {} not present on {}; nothing to migrate", CONSTRAINT_NAME, TABLE_NAME);
            }
        } catch (Exception e) {
            throw new IllegalStateException("Schema migration failed: " + e.getMessage(), e);
        }
    }

    private boolean constraintExists(Connection conn, String table, String constraint) throws java.sql.SQLException {
        String sql = "SELECT 1 FROM information_schema.table_constraints " +
                "WHERE table_name = ? AND constraint_name = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, table);
            ps.setString(2, constraint);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }
}
