package com.pa.proyecto.backend_integrator.adapter.persistence;
import com.pa.proyecto.backend_integrator.adapter.persistence.entity.TaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface TaskJpaRepository extends JpaRepository<TaskEntity,Long> {
 @org.springframework.data.jpa.repository.EntityGraph(attributePaths="project")
 List<TaskEntity> findTop4ByOrderByCreatedAtDescIdDesc();
 Optional<TaskEntity> findByIdAndProjectId(Long id,Long projectId);
 Optional<TaskEntity> findByClientRequestId(UUID clientRequestId);
 List<TaskEntity> findByProjectId(Long projectId);
}
