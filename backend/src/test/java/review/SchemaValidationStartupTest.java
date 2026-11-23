package review;

import com.pa.proyecto.backend_integrator.BackendIntegratorApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import java.sql.DriverManager;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@SpringBootTest(classes = BackendIntegratorApplication.class, properties = {
        "spring.datasource.url=jdbc:h2:mem:nivi_schema_validation;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=${DDL_AUTO:update}",
        "DDL_AUTO=validate"
})
class SchemaValidationStartupTest {
    static {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:nivi_schema_validation;DB_CLOSE_DELAY=-1", "sa", "")) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("review-baseline.sql"));
        } catch (SQLException error) {
            throw new ExceptionInInitializerError(error);
        }
    }

    @Autowired JdbcTemplate jdbc;

    @Test
    void migratesExistingTablesBeforeHibernateValidation() {
        assertEquals("MANUAL", jdbc.queryForObject("select source from tasks where id=500", String.class));
        assertEquals("DONE", jdbc.queryForObject("select status from tasks where id=500", String.class));
        assertNull(jdbc.queryForObject("select place_id from tasks where id=500", String.class));
    }
}
