package com.pa.proyecto.backend_integrator.config;


import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;
import com.pa.proyecto.backend_integrator.core.output.ITaskRepository;
import com.pa.proyecto.backend_integrator.core.usecase.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class UseCaseConfig {
 @Bean public RecentTasksUseCase recentTasks(ITaskRepository tasks){return new RecentTasksUseCase(tasks);}

 @Bean public ProjectQueriesUseCase projectQueries(IProjectRepository p){return new ProjectQueriesUseCase(p);}
 @Bean public TaskQueriesUseCase taskQueries(ITaskRepository t,IProjectRepository p){return new TaskQueriesUseCase(t,p);}


    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }

    // PROJECT
    @Bean
    public CreateProjectUseCase createProjectUseCase(IProjectRepository projectRepository, Clock clock) {
        return new CreateProjectUseCase(projectRepository, clock);
    }

    @Bean
    public UpdateProjectUseCase updateProjectUseCase(IProjectRepository projectRepository) {
        return new UpdateProjectUseCase(projectRepository);
    }

    @Bean
    public FindAllProjectsUseCase findAllProjectsUseCase(
            IProjectRepository projectRepository) {

        return new FindAllProjectsUseCase(projectRepository);
    }

    // TASK
    @Bean
    public CreateTaskUseCase createTaskUseCase(IProjectRepository projectRepository, ITaskRepository taskRepository, Clock clock) {
        return new CreateTaskUseCase(projectRepository, taskRepository, clock);
    }

    @Bean
    public UpdateTaskUseCase updateTaskUseCase(ITaskRepository taskRepository) {
        return new UpdateTaskUseCase(taskRepository);
    }

}