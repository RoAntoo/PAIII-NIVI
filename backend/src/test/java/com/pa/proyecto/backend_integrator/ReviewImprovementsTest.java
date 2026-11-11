package com.pa.proyecto.backend_integrator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;
import jakarta.persistence.EntityManagerFactory;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser
class ReviewImprovementsTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired IProjectRepository projects;
    @Autowired EntityManagerFactory entityManagerFactory;

    long project() throws Exception {
        return json.readTree(mvc.perform(post("/projects").contentType("application/json")
                        .content("{\"name\":\"" + UUID.randomUUID() + "\",\"startDate\":\"2099-01-01\",\"endDate\":\"2099-02-01\",\"status\":\"ACTIVE\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    long task(long project, String status) throws Exception {
        return json.readTree(mvc.perform(post("/projects/" + project + "/tasks").contentType("application/json")
                        .content("{\"title\":\"Task\",\"estimateHours\":1,\"status\":\"" + status + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    @Test void rejectsOversizedTextWithoutReportingDuplicateName() throws Exception {
        long project = project();
        String body = json.writeValueAsString(java.util.Map.of("description", "x".repeat(256)));
        mvc.perform(put("/projects/" + project).contentType("application/json").content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Project description must contain at most 255 characters"));
        long task = task(project, "TODO");
        mvc.perform(put("/projects/" + project + "/tasks/" + task).contentType("application/json")
                        .content(json.writeValueAsString(java.util.Map.of("assignee", "x".repeat(256)))))
                .andExpect(status().isBadRequest());
    }

    @Test void rejectsFractionsAndLegacyStatusWithoutSilentlyCoercingValues() throws Exception {
        String path = "/projects/" + project() + "/tasks";
        mvc.perform(post(path).contentType("application/json").content("{\"title\":\"Task\",\"estimateHours\":1.5,\"status\":\"TODO\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(path).contentType("application/json").content("{\"title\":\"Task\",\"estimateHours\":1,\"status\":\"COMPLETED\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void closedProjectsCannotHaveTheirExistingTasksEdited() throws Exception {
        long project = project(), task = task(project, "TODO");
        var existing = projects.findById(project).orElseThrow();
        existing.setStatus(ProjectStatus.CLOSED);
        projects.save(existing);
        String path = "/projects/" + project + "/tasks/" + task;
        mvc.perform(put(path).contentType("application/json").content("{\"title\":\"Changed\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("BUSINESS_RULE"));
        mvc.perform(get(path)).andExpect(jsonPath("$.title").value("Task"));
    }

    @Test void summaryLimitAndCountsDoNotHydrateProjectsOrTasks() throws Exception {
        for (int i = 0; i < 3; i++) project();
        long project = project();
        task(project, "TODO"); task(project, "DONE");
        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        try {
            statistics.clear();
            mvc.perform(get("/projects").param("limit", "3"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(3))
                    .andExpect(jsonPath("$[0].id").value(project)).andExpect(jsonPath("$[0].totalTasks").value(2))
                    .andExpect(jsonPath("$[0].completedTasks").value(1));
            assertEquals(1, statistics.getPrepareStatementCount());
            assertEquals(0, statistics.getEntityLoadCount());
            assertEquals(0, statistics.getCollectionLoadCount());
        } finally { statistics.setStatisticsEnabled(false); }
        mvc.perform(get("/projects").param("limit", "0")).andExpect(status().isBadRequest());
        mvc.perform(get("/projects").param("limit", "101")).andExpect(status().isBadRequest());
    }
}
