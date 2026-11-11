//EL test me funciona con la ruta anterior de este paquete¿? la actual y la que deberia ser es la:
// package com.pa.proyecto.backend_integrator.core.usecase;
package usecase;

import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import com.pa.proyecto.backend_integrator.core.input.DTO.UpdateTaskDTO;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.output.ITaskRepository;

import com.pa.proyecto.backend_integrator.core.usecase.UpdateTaskUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UpdateTaskUseCaseTest {

    @Mock
    private ITaskRepository taskRepository;

    @Mock
    private Task mockTask;

    @InjectMocks
    private UpdateTaskUseCase updateTaskUseCase;

    private Long taskId = 1L;

    @BeforeEach
    void setUp() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(mockTask));
        var project = new com.pa.proyecto.backend_integrator.core.model.Project();
        project.setStatus(com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus.ACTIVE);
        lenient().when(mockTask.getProject()).thenReturn(project);
    }

    @Test
    void testUpdateTask_HappyPath_AllFields() {
        UpdateTaskDTO dto = new UpdateTaskDTO("new title", 10, "new_user");

        when(taskRepository.save(mockTask)).thenReturn(mockTask);

        Task result = updateTaskUseCase.updateTask(taskId, dto);

        assertNotNull(result);
        verify(mockTask, times(1)).setTitle("new title");
        verify(mockTask, times(1)).setEstimateHours(10);
        verify(mockTask, times(1)).setAssignee("new_user");
        verify(taskRepository, times(1)).save(mockTask);
    }

    @Test
    void testUpdateTask_HappyPath_PartialUpdate() {
        UpdateTaskDTO dto = new UpdateTaskDTO();
        dto.setEstimateHours(5);

        when(taskRepository.save(mockTask)).thenReturn(mockTask);

        Task result = updateTaskUseCase.updateTask(taskId, dto);

        assertNotNull(result);
        verify(mockTask, never()).setTitle(anyString());
        verify(mockTask, times(1)).setEstimateHours(5);
        verify(mockTask, never()).setAssignee(nullable(String.class));
        verify(taskRepository, times(1)).save(mockTask);
    }

    @Test
    void testUpdateTask_Fails_WhenTaskNotFound() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

        UpdateTaskDTO dto = new UpdateTaskDTO("test", 5, "user");

        assertThrows(ResourceNotFoundException.class, () -> {
            updateTaskUseCase.updateTask(taskId, dto);
        });

        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void testUpdateTask_Fails_WhenEstimateHoursIsZero() {
        UpdateTaskDTO dto = new UpdateTaskDTO(null, 0, null);

        assertThrows(IllegalArgumentException.class, () -> {
            updateTaskUseCase.updateTask(taskId, dto);
        });

        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void testUpdateTask_Fails_WhenEstimateHoursIsNegative() {
        UpdateTaskDTO dto = new UpdateTaskDTO(null, -5, null);

        assertThrows(IllegalArgumentException.class, () -> {
            updateTaskUseCase.updateTask(taskId, dto);
        });

        verify(taskRepository, never()).save(any(Task.class));
    }
}
