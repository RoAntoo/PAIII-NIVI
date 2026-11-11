package com.pa.proyecto.backend_integrator.adapter.web;
import com.pa.proyecto.backend_integrator.core.usecase.RecentTasksUseCase;
import com.pa.proyecto.backend_integrator.core.input.DTO.TaskResponseDTO;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@RestController @Transactional(readOnly=true)
public class RecentTasksController {
 private final RecentTasksUseCase useCase;
 public RecentTasksController(RecentTasksUseCase useCase){this.useCase=useCase;}
 public record RecentTask(TaskResponseDTO task,Long projectId,String projectName) {}
 @GetMapping("/projects/recent-tasks")
 public List<RecentTask> recent(){return useCase.find().stream().map(t->new RecentTask(new TaskResponseDTO(t.getId(),t.getTitle(),t.getEstimateHours(),t.getAssignee(),t.getStatus(),t.getFinishedAt(),t.getCreatedAt(),t.getProject().getId()),t.getProject().getId(),t.getProject().getName())).toList();}
}
