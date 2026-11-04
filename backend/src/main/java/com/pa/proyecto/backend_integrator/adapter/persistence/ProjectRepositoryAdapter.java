package com.pa.proyecto.backend_integrator.adapter.persistence;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO;
import com.pa.proyecto.backend_integrator.adapter.persistence.entity.ProjectEntity;
import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Repository @Transactional
public class ProjectRepositoryAdapter implements IProjectRepository {
 private final ProjectJpaRepository repository; private final ProjectSpecification specification;
 public ProjectRepositoryAdapter(ProjectJpaRepository repository,ProjectSpecification specification){this.repository=repository;this.specification=specification;}
 public Project save(Project p){ProjectEntity e=p.getId()==null?new ProjectEntity():repository.findById(p.getId()).orElseThrow(()->new ResourceNotFoundException("Project not found"));PersistenceMapper.copy(p,e);return PersistenceMapper.project(repository.saveAndFlush(e));}
 public Optional<Project> findById(Long id){return repository.findById(id).map(PersistenceMapper::project);}
 public boolean existsByName(String name){return repository.existsByName(name);}
 public boolean existsById(Long id){return repository.existsById(id);}
 public List<Project> findAll(FindProjectsQueryDTO query){return repository.findAll(specification.build(query)).stream().map(PersistenceMapper::project).toList();}
 public void delete(Project p){ProjectEntity e=repository.findById(p.getId()).orElseThrow(()->new ResourceNotFoundException("Project not found"));repository.delete(e);repository.flush();}
}
