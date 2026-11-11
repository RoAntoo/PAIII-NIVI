package com.pa.proyecto.backend_integrator;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser
class MobileTaskApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired com.pa.proyecto.backend_integrator.core.usecase.CreateTaskUseCase createTasks;

    String project() throws Exception {
        String body = """
                {"name":"%s","startDate":"2099-01-01","endDate":"2099-02-01","status":"PLANNED"}
                """.formatted(java.util.UUID.randomUUID());
        long id = json.readTree(mvc.perform(post("/projects").contentType("application/json").content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        return "/projects/" + id;
    }

    String task(String project, String metadata) throws Exception {
        long id = json.readTree(mvc.perform(post(project + "/tasks").contentType("application/json")
                .content("{\"title\":\"Comprar tornillos\",\"estimateHours\":2,\"assignee\":\"Ana\",\"status\":\"TODO\"" + metadata + "}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        return project + "/tasks/" + id;
    }

    @Test void defaultsCompletionReopeningAndIndividualDeletion() throws Exception {
        String p = project(), t = task(p, "");
        mvc.perform(get(t)).andExpect(jsonPath("$.source").value("MANUAL"))
                .andExpect(jsonPath("$.category").value("GENERAL"));
        String done = mvc.perform(put(t).contentType("application/json").content("{\"status\":\"DONE\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.finishedAt").isNotEmpty())
                .andExpect(jsonPath("$.title").value("Comprar tornillos"))
                .andExpect(jsonPath("$.assignee").value("Ana")).andReturn().getResponse().getContentAsString();
        String repeated = mvc.perform(put(t).contentType("application/json").content("{\"status\":\"DONE\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(json.readTree(done).get("finishedAt"), json.readTree(repeated).get("finishedAt"));
        mvc.perform(get(p)).andExpect(jsonPath("$.completedTasks").value(1));
        mvc.perform(put(t).contentType("application/json").content("{\"status\":\"TODO\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.finishedAt").doesNotExist());
        mvc.perform(delete(t)).andExpect(status().isNoContent());
        mvc.perform(get(t)).andExpect(status().isNotFound());
        mvc.perform(get(p)).andExpect(jsonPath("$.totalTasks").value(0));
    }

    @Test void metadataAndExistingFieldsSurviveRoundTripAndPartialUpdate() throws Exception {
        String clientId = java.util.UUID.randomUUID().toString();
        String p = project(), t = task(p, ",\"source\":\"OCR\",\"category\":\"COMPRAS\",\"clientRequestId\":\"" + clientId + "\"");
        String before = mvc.perform(get(t)).andReturn().getResponse().getContentAsString();
        mvc.perform(put(t).contentType("application/json").content("{\"title\":\"Comprar clavos\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.source").value("OCR"))
                .andExpect(jsonPath("$.category").value("COMPRAS"))
                .andExpect(jsonPath("$.clientRequestId").value(clientId))
                .andExpect(jsonPath("$.estimateHours").value(2)).andExpect(jsonPath("$.assignee").value("Ana"))
                .andExpect(jsonPath("$.createdAt").value(json.readTree(before).get("createdAt").asText()));
        mvc.perform(get(p + "/tasks")).andExpect(jsonPath("$[0].source").value("OCR"));
        mvc.perform(get("/projects/recent-tasks")).andExpect(jsonPath("$[0].task.category").value("COMPRAS"));
    }

    @Test void invalidMetadataIsRejectedAndDuplicateClientIdReplaysWithoutPartialWrites() throws Exception {
        String p = project(), t = task(p, ""), clientId = java.util.UUID.randomUUID().toString();
        for (String invalid : new String[]{"{\"title\":\" \"}", "{\"category\":\"INVALID\"}",
                "{\"status\":null}", "{\"category\":null}", "{\"title\":\"Changed\",\"estimateHours\":1.5}"}) {
            mvc.perform(put(t).contentType("application/json").content(invalid)).andExpect(status().isBadRequest());
        }
        mvc.perform(get(t)).andExpect(jsonPath("$.title").value("Comprar tornillos"));
        task(p, ",\"clientRequestId\":\"" + clientId + "\"");
        mvc.perform(post(p + "/tasks").contentType("application/json").content(
                "{\"title\":\"Duplicate\",\"estimateHours\":1,\"status\":\"TODO\",\"clientRequestId\":\"" + clientId + "\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.title").value("Comprar tornillos"));
        mvc.perform(get(p + "/tasks")).andExpect(jsonPath("$.length()").value(2));
    }

    @Test void simultaneousCreatesWithSameKeyReturnOneTask() throws Exception {
        String p = project();
        long projectId = Long.parseLong(p.substring("/projects/".length()));
        var key = java.util.UUID.randomUUID();
        var dto = new com.pa.proyecto.backend_integrator.core.input.DTO.CreateTaskDTO("Concurrent", 1, null,
                com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus.TODO, null, null, key);
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Long> create = () -> { start.await(); return createTasks.createTask(projectId, dto).getId(); };
            var first = pool.submit(create);
            var second = pool.submit(create);
            start.countDown();
            assertEquals(first.get(10, java.util.concurrent.TimeUnit.SECONDS), second.get(10, java.util.concurrent.TimeUnit.SECONDS));
        }
        mvc.perform(get(p + "/tasks")).andExpect(jsonPath("$.length()").value(1));
    }

    @Test void replayReturnsCurrentTaskEvenAfterEditOrProjectClosureAndRejectsForeignProject() throws Exception {
        String p = project(), key = java.util.UUID.randomUUID().toString();
        String t = task(p, ",\"clientRequestId\":\"" + key + "\"");
        mvc.perform(put(t).contentType("application/json").content("{\"title\":\"Edited later\"}"))
                .andExpect(status().isOk());
        jdbc.update("update projects set status='CLOSED' where id=?", Long.parseLong(p.substring("/projects/".length())));
        String payload = "{\"title\":\"Original\",\"estimateHours\":1,\"status\":\"TODO\",\"clientRequestId\":\"" + key + "\"}";
        mvc.perform(post(p + "/tasks").contentType("application/json").content(payload))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.title").value("Edited later"));
        mvc.perform(post(project() + "/tasks").contentType("application/json").content(payload))
                .andExpect(status().isConflict());
        mvc.perform(get(p + "/tasks")).andExpect(jsonPath("$.length()").value(1));
    }

    @Test void foreignAndClosedProjectTasksCannotBeDeletedOrCompleted() throws Exception {
        String p = project(), t = task(p, ""), other = project();
        String foreign = other + t.substring(t.indexOf("/tasks/"));
        mvc.perform(delete(foreign)).andExpect(status().isNotFound());
        mvc.perform(put(foreign).contentType("application/json").content("{\"status\":\"DONE\"}"))
                .andExpect(status().isNotFound());
        jdbc.update("update projects set status='CLOSED' where id=?", Long.parseLong(p.substring("/projects/".length())));
        mvc.perform(delete(t)).andExpect(status().isConflict());
        mvc.perform(put(t).contentType("application/json").content("{\"status\":\"DONE\"}"))
                .andExpect(status().isConflict());
        mvc.perform(get(t)).andExpect(jsonPath("$.status").value("TODO"));
    }
}
