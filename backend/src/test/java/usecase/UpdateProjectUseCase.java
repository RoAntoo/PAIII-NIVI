//EL test me funciona con la ruta anterior de este paquete¿? la actual y la que deberia ser es la:
// package com.pa.proyecto.backend_integrator.core.usecase;
package usecase;

import com.pa.proyecto.backend_integrator.core.exception.BusinessRuleViolationException;
import com.pa.proyecto.backend_integrator.core.exception.DuplicateResourceException;
import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import com.pa.proyecto.backend_integrator.core.input.DTO.UpdateProjectDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;

import com.pa.proyecto.backend_integrator.core.usecase.UpdateProjectUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UpdateProjectUseCaseTest {

    @Mock
    private IProjectRepository projectRepository;

    @InjectMocks
    private UpdateProjectUseCase updateProjectUseCase;

    private Project existingProject;
    private Long projectId;

    @BeforeEach
    void setUp() {
        projectId = 1L;
        existingProject = Project.create(
                "original project",
                LocalDate.of(2025, 1, 10),
                LocalDate.of(2025, 1, 20),
                ProjectStatus.ACTIVE,
                "original desc",
                LocalDate.of(2025, 1, 1) // today
        );
    }

    @Test
    void testUpdateProject_HappyPath_AllFields() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(existingProject));
        when(projectRepository.existsByName("new name")).thenReturn(false);
        when(projectRepository.save(any(Project.class))).thenReturn(existingProject);

        UpdateProjectDTO dto = new UpdateProjectDTO(
                "new name",
                LocalDate.of(2025, 1, 12),
                LocalDate.of(2025, 1, 22),
                "new desc"
        );

        Project result = updateProjectUseCase.updateProject(projectId, dto);

        assertNotNull(result);
        assertEquals("new name", result.getName());
        assertEquals(LocalDate.of(2025, 1, 12), result.getStartDate());
        assertEquals(LocalDate.of(2025, 1, 22), result.getEndDate());
        assertEquals("new desc", result.getDescription());
        verify(projectRepository, times(1)).findById(projectId);
        verify(projectRepository, times(1)).existsByName("new name");
        verify(projectRepository, times(1)).save(existingProject);
    }

    @Test
    void testUpdateProject_HappyPath_PartialUpdate() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(existingProject));
        when(projectRepository.save(any(Project.class))).thenReturn(existingProject);

        UpdateProjectDTO dto = new UpdateProjectDTO(
                null, // No se actualiza nombre
                null, // No se actualiza start date
                LocalDate.of(2025, 1, 25), // Se actualiza end date
                null  // No se actualiza desc
        );

        Project result = updateProjectUseCase.updateProject(projectId, dto);

        assertEquals("original project", result.getName());
        assertEquals(LocalDate.of(2025, 1, 10), result.getStartDate());
        assertEquals(LocalDate.of(2025, 1, 25), result.getEndDate());
        verify(projectRepository, never()).existsByName(anyString());
        verify(projectRepository, times(1)).save(existingProject);
    }

    @Test
    void testUpdateProject_Fails_WhenProjectNotFound() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.empty());

        UpdateProjectDTO dto = new UpdateProjectDTO("new", null, null, null);

        assertThrows(ResourceNotFoundException.class, () -> {
            updateProjectUseCase.updateProject(projectId, dto);
        });

        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    void testUpdateProject_Fails_WhenNameIsDuplicate() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(existingProject));
        when(projectRepository.existsByName("duplicate name")).thenReturn(true);

        UpdateProjectDTO dto = new UpdateProjectDTO("duplicate name", null, null, null);

        assertThrows(DuplicateResourceException.class, () -> {
            updateProjectUseCase.updateProject(projectId, dto);
        });

        verify(projectRepository, times(1)).existsByName("duplicate name");
        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    void testUpdateProject_Fails_WhenEndDateIsBeforeStartDate() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(existingProject));

        UpdateProjectDTO dto = new UpdateProjectDTO(
                null,
                LocalDate.of(2025, 1, 30),
                LocalDate.of(2025, 1, 29),
                null
        );

        assertThrows(BusinessRuleViolationException.class, () -> {
            updateProjectUseCase.updateProject(projectId, dto);
        });

        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    void testUpdateProject_Fails_WhenMixingOldAndNewDatesAreInvalid() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(existingProject));

        //StartDate (10-ene) se mantiene, pero el nuevo EndDate (9-Ene) es invalido
        UpdateProjectDTO dto = new UpdateProjectDTO(
                null,
                null,
                LocalDate.of(2025, 1, 9),
                null
        );

        assertThrows(BusinessRuleViolationException.class, () -> {
            updateProjectUseCase.updateProject(projectId, dto);
        });

        verify(projectRepository, never()).save(any(Project.class));
    }
}