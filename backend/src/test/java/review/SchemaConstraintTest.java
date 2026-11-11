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
