//EL test me funciona con la ruta anterior de este paquete¿? la actual y la que deberia ser es la:
// package com.pa.proyecto.backend_integrator.core.usecase;
package usecase;

import com.pa.proyecto.backend_integrator.core.exception.BusinessRuleViolationException;
import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import com.pa.proyecto.backend_integrator.core.input.DTO.CreateTaskDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;
import com.pa.proyecto.backend_integrator.core.output.ITaskRepository;

import com.pa.proyecto.backend_integrator.core.usecase.CreateTaskUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreateTaskUseCaseTest {

    @Mock
    private IProjectRepository projectRepository;

    @Mock
    private ITaskRepository taskRepository;

    @Mock
    private Clock clock;

    @Mock
    private Project mockProject;

    @InjectMocks
    private CreateTaskUseCase createTaskUseCase;

    private Long projectId = 1L;
    private LocalDateTime fakeNow;
    private CreateTaskDTO validDTO;

    @BeforeEach
    void setUp() {
        fakeNow = LocalDateTime.of(2025, 11, 10, 10, 0);

        validDTO = new CreateTaskDTO(
                "Nueva Tarea",
                8,
                "user",
                TaskStatus.TODO
        );
    }

    @Test
    void testCreateTask_HappyPath() {
        Instant instant = fakeNow.atZone(ZoneId.systemDefault()).toInstant();
        when(clock.instant()).thenReturn(instant);
        when(clock.getZone()).thenReturn(ZoneId.systemDefault());

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(mockProject));
        when(mockProject.getStatus()).thenReturn(ProjectStatus.ACTIVE);
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Task result = createTaskUseCase.createTask(projectId, validDTO);

        assertNotNull(result);
        assertEquals("Nueva Tarea", result.getTitle());
        verify(projectRepository, times(1)).findById(projectId);
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    void testCreateTask_Fails_WhenProjectNotFound() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            createTaskUseCase.createTask(projectId, validDTO);
        });

        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void testCreateTask_Fails_WhenProjectIsClosed() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(mockProject));
        when(mockProject.getStatus()).thenReturn(ProjectStatus.CLOSED);

        assertThrows(BusinessRuleViolationException.class, () -> {
            createTaskUseCase.createTask(projectId, validDTO);
        });

        verify(taskRepository, never()).save(any(Task.class));
    }
}