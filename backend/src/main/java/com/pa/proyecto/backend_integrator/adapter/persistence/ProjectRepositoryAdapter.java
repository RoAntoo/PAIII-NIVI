package com.pa.proyecto.backend_integrator.adapter.persistence;

import com.pa.proyecto.backend_integrator.adapter.persistence.entity.ProjectEntity;
import com.pa.proyecto.backend_integrator.adapter.persistence.entity.TaskEntity;
import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.model.ProjectSummary;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Repository
@Transactional
public class ProjectRepositoryAdapter implements IProjectRepository {
    private final ProjectJpaRepository repository;
    private final ProjectSpecification specification;
    private final EntityManager entityManager;

    public ProjectRepositoryAdapter(ProjectJpaRepository repository, ProjectSpecification specification,
                                    EntityManager entityManager) {
        this.repository = repository;
        this.specification = specification;
        this.entityManager = entityManager;
    }

    public Project save(Project project) {
        ProjectEntity entity = project.getId() == null ? new ProjectEntity() : require(project.getId());
        PersistenceMapper.copy(project, entity);
        return PersistenceMapper.project(repository.saveAndFlush(entity));
    }

    @Transactional(readOnly = true)
    public Optional<Project> findById(Long id) {
        return repository.findById(id).map(PersistenceMapper::project);
    }

    public boolean existsByName(String name) { return repository.existsByName(name); }
    public boolean existsById(Long id) { return repository.existsById(id); }

    @Transactional(readOnly = true)
    public List<ProjectSummary> findAll(FindProjectsQueryDTO query) {
        var cb = entityManager.getCriteriaBuilder();
        var criteria = cb.createQuery(ProjectSummary.class);
        var project = criteria.from(ProjectEntity.class);
        Join<ProjectEntity, TaskEntity> task = project.join("tasks", JoinType.LEFT);
        var completed = cb.sum(cb.<Long>selectCase()
                .when(cb.equal(task.get("status"), TaskStatus.DONE), 1L).otherwise(0L));
        criteria.select(cb.construct(ProjectSummary.class,
                project.get("id"), project.get("name"), project.get("startDate"),
                project.get("endDate"), project.get("status"), project.get("description"),
                cb.count(task.get("id")), completed));
        criteria.where(specification.build(query).toPredicate(project, criteria, cb));
        criteria.groupBy(project.get("id"), project.get("name"), project.get("startDate"),
                project.get("endDate"), project.get("status"), project.get("description"));
        criteria.orderBy(cb.desc(project.get("id")));
        var result = entityManager.createQuery(criteria);
        query.limit().ifPresent(result::setMaxResults);
        return result.getResultList();
    }

    public void delete(Project project) {
        repository.delete(require(project.getId()));
        repository.flush();
    }

    private ProjectEntity require(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    }
}
