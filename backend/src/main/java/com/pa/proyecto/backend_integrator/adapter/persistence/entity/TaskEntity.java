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
 @Column(nullable=false) private Integer estimateHours;
 private String assignee;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private TaskStatus status;
 private java.time.LocalDateTime finishedAt;
 private java.time.LocalDateTime createdAt;
 @Enumerated(EnumType.STRING) @Column(nullable=false, columnDefinition="varchar(20) default 'MANUAL'")
 private TaskSource source = TaskSource.MANUAL;
 @Enumerated(EnumType.STRING) @Column(nullable=false, columnDefinition="varchar(20) default 'GENERAL'")
 private TaskCategory category = TaskCategory.GENERAL;
 private java.util.UUID clientRequestId;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="project_id",nullable=false) private ProjectEntity project;
}
