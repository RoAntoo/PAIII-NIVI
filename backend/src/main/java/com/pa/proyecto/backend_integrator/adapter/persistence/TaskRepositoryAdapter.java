package com.pa.proyecto.backend_integrator.adapter.persistence;
import com.pa.proyecto.backend_integrator.core.output.ITaskRepository;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.adapter.persistence.entity.TaskEntity;
import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Repository @Transactional
public class TaskRepositoryAdapter implements ITaskRepository {
 private final TaskJpaRepository repository;private final ProjectJpaRepository projects;
 public TaskRepositoryAdapter(TaskJpaRepository repository,ProjectJpaRepository projects){this.repository=repository;this.projects=projects;}
 public Task save(Task t){TaskEntity e=t.getId()==null?new TaskEntity():repository.findById(t.getId()).orElseThrow(()->new ResourceNotFoundException("Task not found"));PersistenceMapper.copy(t,e);e.setProject(projects.findById(t.getProject().getId()).orElseThrow(()->new ResourceNotFoundException("Project not found")));return PersistenceMapper.task(repository.saveAndFlush(e));}
 public Optional<Task> findById(Long id){return repository.findById(id).map(PersistenceMapper::task);}
 public Optional<Task> findByIdAndProjectId(Long id,Long p){return repository.findByIdAndProjectId(id,p).map(PersistenceMapper::task);}
 public List<Task> findByProjectId(Long p){return repository.findByProjectId(p).stream().map(PersistenceMapper::task).toList();}
 public boolean existsById(Long id){return repository.existsById(id);}
}
