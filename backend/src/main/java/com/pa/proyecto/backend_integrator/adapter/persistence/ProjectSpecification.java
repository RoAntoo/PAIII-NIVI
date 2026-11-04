package com.pa.proyecto.backend_integrator.adapter.persistence;

import com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

@Component
public class ProjectSpecification {

    public Specification<Project> build(FindProjectsQueryDTO queryDTO) {

        return (root, query, cb) -> {

            List<Predicate> predicates = new ArrayList<>();

            queryDTO.status().ifPresent(status -> {
                predicates.add(cb.equal(root.get("status"), status));
            });

            queryDTO.startDate().ifPresent(date -> {
                // "WHERE endDate >= :date"
                predicates.add(cb.greaterThanOrEqualTo(root.get("endDate"), date));
            });

            queryDTO.endDate().ifPresent(date -> {
                predicates.add(cb.lessThanOrEqualTo(root.get("startDate"), date));
            });

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}