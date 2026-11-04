//EL test me funciona con la ruta anterior de este paquete¿? la actual y la que deberia ser es la:
// package com.pa.proyecto.backend_integrator.core.usecase;
package usecase;

import com.pa.proyecto.backend_integrator.core.exception.BusinessRuleViolationException;
import com.pa.proyecto.backend_integrator.core.exception.DuplicateResourceException;
import com.pa.proyecto.backend_integrator.core.input.DTO.CreateProjectDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;

import com.pa.proyecto.backend_integrator.core.usecase.CreateProjectUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreateProjectUseCaseTest {

    @Mock
    private IProjectRepository projectRepository;

    @Mock
    private Clock clock;

    @InjectMocks
    private CreateProjectUseCase createProjectUseCase;

    private CreateProjectDTO validDTO;
    private LocalDate fakeToday;
    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    void setUp() {
        fakeToday = LocalDate.of(2025, 1, 1);

        startDate = fakeToday.plusDays(5);
        endDate = fakeToday.plusDays(10);

        validDTO = new CreateProjectDTO(
                "project Test",
                startDate,
                endDate,
                ProjectStatus.PLANNED,
                "Descriptión"
        );
    }

    @Test
    void testCreateProject_HappyPath() {
        Instant instant = fakeToday.atStartOfDay(ZoneId.systemDefault()).toInstant();
        when(clock.instant()).thenReturn(instant);
        when(clock.getZone()).thenReturn(ZoneId.systemDefault());

        when(projectRepository.existsByName(validDTO.name())).thenReturn(false);
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Project result = createProjectUseCase.createProject(validDTO);

        assertNotNull(result);
        assertEquals(validDTO.name(), result.getName());
        verify(projectRepository, times(1)).existsByName(validDTO.name());
        verify(projectRepository, times(1)).save(any(Project.class));
    }

    @Test
    void testCreateProject_Fails_WhenNameIsDuplicate() {
        when(projectRepository.existsByName(validDTO.name())).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> {
            createProjectUseCase.createProject(validDTO);
        });

        verify(projectRepository, times(1)).existsByName(validDTO.name());
        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    void testCreateProject_Fails_WhenEndDateIsBeforeStartDate() {
        CreateProjectDTO dto = new CreateProjectDTO(
                "Test",
                validDTO.endDate(),   // StartDate (+ tarde)
                validDTO.startDate(), // EndDate (+ tem)
                ProjectStatus.PLANNED,
                "Desc"
        );

        assertThrows(BusinessRuleViolationException.class, () -> {
            createProjectUseCase.createProject(dto);
        });

        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    void testCreateProject_Fails_WhenEndDateIsBeforeToday() {
        LocalDate endDateInPast = fakeToday.minusDays(1); // Un día ANTES del 'today'
        LocalDate startDateInPast = fakeToday.minusDays(2); // Dos días ANTES (para que lo tome)

        CreateProjectDTO dto = new CreateProjectDTO(
                "Test",
                startDateInPast,
                endDateInPast,
                ProjectStatus.PLANNED,
                "Desc"
        );

        Instant instant = fakeToday.atStartOfDay(ZoneId.systemDefault()).toInstant();
        when(clock.instant()).thenReturn(instant);
        when(clock.getZone()).thenReturn(ZoneId.systemDefault());

        when(projectRepository.existsByName("Test")).thenReturn(false);

        assertThrows(BusinessRuleViolationException.class, () -> {
            createProjectUseCase.createProject(dto);
        });

        verify(projectRepository, never()).save(any(Project.class));
    }
}