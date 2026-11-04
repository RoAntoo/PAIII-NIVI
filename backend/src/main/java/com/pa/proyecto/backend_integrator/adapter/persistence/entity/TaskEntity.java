package com.pa.proyecto.backend_integrator.adapter.persistence.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import com.pa.proyecto.backend_integrator.core.model.enums.*;
@Getter @Setter @Entity
@Table(name="tasks")
public class TaskEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private String title;
 private Integer estimateHours;
 private String assignee;
 @Enumerated(EnumType.STRING) private TaskStatus status;
 private java.time.LocalDateTime finishedAt;
 private java.time.LocalDateTime createdAt;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="project_id",nullable=false) private ProjectEntity project;
}
