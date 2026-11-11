package com.pa.proyecto.backend_integrator.adapter.persistence;
import com.pa.proyecto.backend_integrator.core.model.*;
import com.pa.proyecto.backend_integrator.adapter.persistence.entity.*;
final class PersistenceMapper {
 private PersistenceMapper() {}
 static Project project(ProjectEntity e) {
  Project p=projectFields(e);
  for(TaskEntity t:e.getTasks()) p.addTask(taskFields(t,p));
  return p;
 }
 private static Project projectFields(ProjectEntity e) {
  Project p=new Project();p.setId(e.getId());p.setName(e.getName());p.setStartDate(e.getStartDate());p.setEndDate(e.getEndDate());p.setStatus(e.getStatus());p.setDescription(e.getDescription());return p;
 }
 static Task task(TaskEntity e) { return taskFields(e,projectFields(e.getProject())); }
 private static Task taskFields(TaskEntity e,Project p) {
  Task t=new Task();t.setId(e.getId());t.setTitle(e.getTitle());t.setEstimateHours(e.getEstimateHours());t.setAssignee(e.getAssignee());t.setStatus(e.getStatus());t.setCreatedAt(e.getCreatedAt());t.setFinishedAt(e.getFinishedAt());t.setProject(p);return t;
 }
 static void copy(Project p,ProjectEntity e) {e.setName(p.getName());e.setStartDate(p.getStartDate());e.setEndDate(p.getEndDate());e.setStatus(p.getStatus());e.setDescription(p.getDescription());}
 static void copy(Task t,TaskEntity e) {e.setTitle(t.getTitle());e.setEstimateHours(t.getEstimateHours());e.setAssignee(t.getAssignee());e.setStatus(t.getStatus());e.setCreatedAt(t.getCreatedAt());e.setFinishedAt(t.getFinishedAt());}
}
