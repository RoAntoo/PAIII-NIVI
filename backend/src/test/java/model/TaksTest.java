//EL test me funciona con la ruta anterior de este paquete¿? la actual y la que deberia ser es la:
// package com.pa.proyecto.backend_integrator.core.model;
package model;

import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

@ExtendWith(MockitoExtension.class)
class TaskTest {

    @Mock
    private Project mockProject;

    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        now = LocalDateTime.of(2025, 11, 10, 10, 0, 0);
        Mockito.when(mockProject.getStatus()).thenReturn(ProjectStatus.ACTIVE);
    }

    @Test
    public void testCreateTask_HappyPath() {
        // 1. Arrange
        String title = "valid task";
        Integer hours = 8;

        // 2. Act
        Task task = Task.create(mockProject, title, hours, "user", TaskStatus.TODO, now);

        // 3. Assert
        Assertions.assertNotNull(task);
        Assertions.assertEquals(title, task.getTitle());
    }

    @Test
    public void testCreateTask_ValidationExceptions() {
        // 1. Project nulo
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            Task.create(null, "Test", 8, "user", TaskStatus.TODO, now);
        });

        // 2. Titulo nulo
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            Task.create(mockProject, null, 8, "user", TaskStatus.TODO, now);
        });

        // 3. Titulo vacío (blank)
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            Task.create(mockProject, " ", 8, "user", TaskStatus.TODO, now);
        });

        // 4. Horas nulas
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            Task.create(mockProject, "Test", null, "user", TaskStatus.TODO, now);
        });

        // 5. Horas <= 0
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            Task.create(mockProject, "Test", 0, "user", TaskStatus.TODO, now);
        });

        // 6. Proyecto CERRADO
        Mockito.when(mockProject.getStatus()).thenReturn(ProjectStatus.CLOSED);
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            Task.create(mockProject, "Test", 8, "user", TaskStatus.TODO, now);
        });
    }

    @Test
    public void testCreateTask_FinishedAtLogic() {
        // Valuamos 'finishedAt'
        LocalDateTime timestamp = LocalDateTime.now();

        // 1. Si es DONE, 'finishedAt' debe ser el timestamp de creacion
        Task taskDone = Task.create(mockProject, "task completed", 5, "user", TaskStatus.DONE, timestamp);
        Assertions.assertEquals(timestamp, taskDone.getFinishedAt());

        // 2. Si el estado es "tdo" debe ser null
        Task taskTodo = Task.create(mockProject, "pending task", 5, "user", TaskStatus.TODO, timestamp);
        Assertions.assertNull(taskTodo.getFinishedAt());

        // 3. Si el estado es IN_PROGRESS, 'finishedAt' debe ser null
        Task taskInProgress = Task.create(mockProject, "task in progress", 5, "user", TaskStatus.IN_PROGRESS, timestamp);
        Assertions.assertNull(taskInProgress.getFinishedAt());
    }
}