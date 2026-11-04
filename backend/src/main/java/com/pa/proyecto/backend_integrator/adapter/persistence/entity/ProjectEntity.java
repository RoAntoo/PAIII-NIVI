package com.pa.proyecto.backend_integrator.adapter.persistence.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import com.pa.proyecto.backend_integrator.core.model.enums.*;
@Getter @Setter @Entity
@Table(name="projects")
public class ProjectEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false, unique=true) private String name;
 private java.time.LocalDate startDate;
 private java.time.LocalDate endDate;
 @Enumerated(EnumType.STRING) private ProjectStatus status;
 private String description;
 @OneToMany(mappedBy="project", cascade=CascadeType.ALL, orphanRemoval=true)
 private java.util.List<TaskEntity> tasks = new java.util.ArrayList<>();
}
