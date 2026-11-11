package review;
import com.pa.proyecto.backend_integrator.BackendIntegratorApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

/** Verifies SQL initialization tightens nullable columns after Hibernate updates H2. */
@SpringBootTest(classes=BackendIntegratorApplication.class, properties={
 "spring.datasource.url=jdbc:h2:mem:review_schema;DB_CLOSE_DELAY=-1",
 "spring.jpa.hibernate.ddl-auto=update"})
class SchemaConstraintTest {
    static {
        try (var connection = java.sql.DriverManager.getConnection("jdbc:h2:mem:review_schema;DB_CLOSE_DELAY=-1", "sa", "")) {
            org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(connection, new org.springframework.core.io.ClassPathResource("review-baseline.sql"));
        } catch (java.sql.SQLException ex) { throw new ExceptionInInitializerError(ex); }
    }
    @Autowired JdbcTemplate jdbc;
    @Test void metadataMigrationIsRepeatableAndRollbackKeepsOriginalTaskData() throws Exception {
        try (var connection = java.sql.DriverManager.getConnection("jdbc:h2:mem:pr01_migration", "sa", "")) {
            try (var sql = connection.createStatement()) {
                sql.execute("create table tasks(id bigint primary key, title varchar(255))");
                sql.execute("insert into tasks values(9, 'Legacy task')");
            }
            var migration = new org.springframework.core.io.ClassPathResource("db/pr01-task-metadata.sql");
            org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(connection, migration);
            org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(connection, migration);
            try (var sql = connection.createStatement(); var row = sql.executeQuery("select id, title, source, category from tasks")) {
                assertTrue(row.next());
                assertEquals(9, row.getLong("id"));
                assertEquals("Legacy task", row.getString("title"));
                assertEquals("MANUAL", row.getString("source"));
                assertEquals("GENERAL", row.getString("category"));
            }
            org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(connection,
                    new org.springframework.core.io.ClassPathResource("db/rollback/pr01-task-metadata.sql"));
            try (var sql = connection.createStatement(); var row = sql.executeQuery("select * from tasks")) {
                assertEquals(2, row.getMetaData().getColumnCount());
                assertTrue(row.next());
                assertEquals("Legacy task", row.getString("title"));
            }
        }
    }
    @Test void legacyTasksKeepIdsAndReceiveMetadataDefaults() {
        assertEquals("MANUAL", jdbc.queryForObject("select source from tasks where id=500", String.class));
        assertEquals("GENERAL", jdbc.queryForObject("select category from tasks where id=500", String.class));
        assertNull(jdbc.queryForObject("select client_request_id from tasks where id=500", java.util.UUID.class));
    }
    @Test void legacyCompletedTasksAreNormalizedWithoutLosingTheirTimestamp() {
        assertEquals("DONE", jdbc.queryForObject("select status from tasks where id=500", String.class));
        assertEquals(jdbc.queryForObject("select created_at from tasks where id=500", java.sql.Timestamp.class),
                jdbc.queryForObject("select finished_at from tasks where id=500", java.sql.Timestamp.class));
        assertEquals(java.sql.Timestamp.valueOf("2020-01-11 12:00:00"),
                jdbc.queryForObject("select finished_at from tasks where id=501", java.sql.Timestamp.class));
        assertEquals("DONE", jdbc.queryForObject("select status from tasks where id=502", String.class));
        assertNull(jdbc.queryForObject("select finished_at from tasks where id=502", java.sql.Timestamp.class));
    }
    /** Checks database metadata after updating a schema with formerly nullable fields. */
    @Test void requiredColumnsAreNotNullable() {
        for (String entry : new String[]{"PROJECTS.START_DATE", "PROJECTS.END_DATE", "PROJECTS.STATUS", "TASKS.ESTIMATE_HOURS", "TASKS.STATUS"}) {
            String[] parts=entry.split("\\.");
            assertEquals("NO",jdbc.queryForObject("select IS_NULLABLE from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME=? and COLUMN_NAME=?",String.class,parts[0],parts[1]),entry);
        }
    }
}
