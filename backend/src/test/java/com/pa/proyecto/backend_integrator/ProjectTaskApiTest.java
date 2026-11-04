package com.pa.proyecto.backend_integrator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest
@AutoConfigureMockMvc
class ProjectTaskApiTest {
 @Autowired MockMvc mvc;
 @Autowired ObjectMapper json;
 @Autowired com.pa.proyecto.backend_integrator.core.output.IProjectRepository projects;
 @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
 @Autowired com.pa.proyecto.backend_integrator.core.output.ITaskRepository tasks;
 long project() throws Exception {
  String body = "{\"name\":\""+java.util.UUID.randomUUID()+"\",\"startDate\":\"2099-01-01\",\"endDate\":\"2099-02-01\",\"status\":\"PLANNED\"}";
  return json.readTree(mvc.perform(post("/projects").contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
 }
 long task(long project) throws Exception {
  return json.readTree(mvc.perform(post("/projects/"+project+"/tasks").contentType("application/json").content("{\"title\":\"Task\",\"estimateHours\":2,\"assignee\":\"Ana\",\"status\":\"TODO\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
 }
 @Test void projectAndTaskCrudAndCascade() throws Exception {
  long p=project(), t=task(p); String path="/projects/"+p;
  mvc.perform(get(path)).andExpect(status().isOk());
  mvc.perform(get(path+"/tasks")).andExpect(jsonPath("$[0].id").value(t));
  mvc.perform(put(path+"/tasks/"+t).contentType("application/json").content("{\"title\":\"Updated\",\"estimateHours\":3,\"assignee\":null}")).andExpect(status().isOk()).andExpect(jsonPath("$.assignee").doesNotExist());
  mvc.perform(delete(path)).andExpect(status().isNoContent());
  org.junit.jupiter.api.Assertions.assertFalse(tasks.existsById(t));
  mvc.perform(get(path)).andExpect(status().isNotFound());
  mvc.perform(get(path+"/tasks/"+t)).andExpect(status().isNotFound());
 }
 @Test void foreignTaskCannotBeReadOrEdited() throws Exception {
  long p=project(), other=project(), t=task(p);String foreign="/projects/"+other+"/tasks/"+t;
  mvc.perform(get(foreign)).andExpect(status().isNotFound());
  mvc.perform(put(foreign).contentType("application/json").content("{\"title\":\"Wrong\",\"estimateHours\":1}")).andExpect(status().isNotFound());
  mvc.perform(get("/projects/"+p+"/tasks/"+t)).andExpect(jsonPath("$.title").value("Task"));
 }
 @Test void invalidUpdatesDoNotPersistPartialChanges() throws Exception {
  long p=project(),t=task(p);String path="/projects/"+p;
  String name=json.readTree(mvc.perform(get(path)).andReturn().getResponse().getContentAsString()).get("name").asText();
  mvc.perform(put(path).contentType("application/json").content("{\"name\":\"Changed\",\"endDate\":\"2000-01-01\"}")).andExpect(status().isConflict());
  mvc.perform(get(path)).andExpect(jsonPath("$.name").value(name));
  mvc.perform(put(path+"/tasks/"+t).contentType("application/json").content("{\"title\":\"Changed\",\"estimateHours\":0}")).andExpect(status().isConflict());
  mvc.perform(get(path+"/tasks/"+t)).andExpect(jsonPath("$.title").value("Task"));
 }
 @Test void emptyAndMissingProjectsAndInvalidCreation() throws Exception {
  long p=project();
  mvc.perform(get("/projects/"+p+"/tasks")).andExpect(status().isOk()).andExpect(content().json("[]"));
  mvc.perform(get("/projects/9223372036854775807/tasks")).andExpect(status().isNotFound());
  mvc.perform(post("/projects").contentType("application/json").content("{}")).andExpect(status().isBadRequest());
  mvc.perform(post("/projects/"+p+"/tasks").contentType("application/json").content("{}")).andExpect(status().isBadRequest());
 }
 @Test void closedProjectsAndDuplicateNamesAreRejected() throws Exception {
  String body="{\"name\":\""+java.util.UUID.randomUUID()+"\",\"startDate\":\"2099-01-01\",\"endDate\":\"2099-02-01\",\"status\":\"CLOSED\"}";
  long p=json.readTree(mvc.perform(post("/projects").contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
  mvc.perform(post("/projects").contentType("application/json").content(body)).andExpect(status().isConflict());
  mvc.perform(post("/projects/"+p+"/tasks").contentType("application/json").content("{\"title\":\"Task\",\"estimateHours\":1,\"status\":\"TODO\"}")).andExpect(status().isConflict());
 }
 @Test void detachedModelsAndProjectUpdatesPreserveTasks() throws Exception {
  long p=project(),t=task(p);
  var detached=projects.findById(p).orElseThrow();
  org.junit.jupiter.api.Assertions.assertEquals(t,detached.getTasks().get(0).getId());
  detached.setName("not saved");
  org.junit.jupiter.api.Assertions.assertNotEquals("not saved",projects.findById(p).orElseThrow().getName());
  mvc.perform(put("/projects/"+p).contentType("application/json").content("{\"description\":\"changed\"}")).andExpect(status().isOk());
  org.junit.jupiter.api.Assertions.assertTrue(tasks.existsById(t));
  org.junit.jupiter.api.Assertions.assertEquals("changed",projects.findById(p).orElseThrow().getDescription());
 }
 @Test void transactionRollbackRestoresProjectAndTasks() throws Exception {
  long p=project(),t=task(p);
  org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,()->new org.springframework.transaction.support.TransactionTemplate(transactions).execute(status->{
   projects.delete(projects.findById(p).orElseThrow());
   org.junit.jupiter.api.Assertions.assertFalse(tasks.existsById(t));
   throw new IllegalStateException("simulated failure after flush");
  }));
  org.junit.jupiter.api.Assertions.assertTrue(projects.existsById(p));
  org.junit.jupiter.api.Assertions.assertTrue(tasks.existsById(t));
 }
 @Test void filtersStillUseStatusAndDateOverlap() throws Exception {
  long p=project();
  var result=projects.findAll(new com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO(java.util.Optional.of(com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus.PLANNED),java.util.Optional.of(java.time.LocalDate.of(2099,1,15)),java.util.Optional.of(java.time.LocalDate.of(2099,1,20))));
  org.junit.jupiter.api.Assertions.assertTrue(result.stream().anyMatch(project->project.getId().equals(p)));
  var absent=projects.findAll(new com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO(java.util.Optional.empty(),java.util.Optional.of(java.time.LocalDate.of(2100,1,1)),java.util.Optional.empty()));
  org.junit.jupiter.api.Assertions.assertTrue(absent.stream().noneMatch(project->project.getId().equals(p)));
 }
 @Test void malformedInputAndCors() throws Exception {
  mvc.perform(post("/projects").contentType("application/json").content("{" )).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").exists());
  mvc.perform(get("/projects/not-a-number")).andExpect(status().isBadRequest());
  mvc.perform(options("/projects").header("Origin","http://localhost:4200").header("Access-Control-Request-Method","POST")).andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","http://localhost:4200"));
  mvc.perform(options("/projects").header("Origin","https://untrusted.example").header("Access-Control-Request-Method","POST")).andExpect(status().isForbidden());
 }
}
