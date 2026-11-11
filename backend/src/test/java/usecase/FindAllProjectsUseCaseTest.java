//EL test me funciona con la ruta anterior de este paquete¿? la actual y la que deberia ser es la:
// package com.pa.proyecto.backend_integrator.core.usecase;
package usecase;

import com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO;
import com.pa.proyecto.backend_integrator.core.model.ProjectSummary;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;

import com.pa.proyecto.backend_integrator.core.usecase.FindAllProjectsUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FindAllProjectsUseCaseTest {

    @Mock
    private IProjectRepository projectRepository;



    @InjectMocks
    private FindAllProjectsUseCase findAllProjectsUseCase;

    @Test
    void testFindAllProjects_NoFilters() {
        FindProjectsQueryDTO query = FindProjectsQueryDTO.empty();
        List<ProjectSummary> mockList = List.of(new ProjectSummary(1L, "Project", java.time.LocalDate.of(2099,1,1), java.time.LocalDate.of(2099,2,1), ProjectStatus.PLANNED, null, 0, 0), new ProjectSummary(1L, "Project", java.time.LocalDate.of(2099,1,1), java.time.LocalDate.of(2099,2,1), ProjectStatus.PLANNED, null, 0, 0));


        when(projectRepository.findAll(query)).thenReturn(mockList);

        List<ProjectSummary> result = findAllProjectsUseCase.findAllProjects(query);

        assertEquals(2, result.size());
        verify(projectRepository, times(1)).findAll(query);
    }

    @Test
    void testFindAllProjects_WithStatusFilter() {
        FindProjectsQueryDTO query = new FindProjectsQueryDTO(
                Optional.of(ProjectStatus.ACTIVE),
                Optional.empty(),
                Optional.empty()
        );
        List<ProjectSummary> mockList = List.of(new ProjectSummary(1L, "Project", java.time.LocalDate.of(2099,1,1), java.time.LocalDate.of(2099,2,1), ProjectStatus.PLANNED, null, 0, 0));

        when(projectRepository.findAll(query)).thenReturn(mockList);

        List<ProjectSummary> result = findAllProjectsUseCase.findAllProjects(query);

        assertEquals(1, result.size());
        verify(projectRepository, times(1)).findAll(query);
    }

    @Test
    void testFindAllProjects_ReturnsEmptyList() {
        FindProjectsQueryDTO query = FindProjectsQueryDTO.empty();
        List<ProjectSummary> emptyList = List.of();

        when(projectRepository.findAll(query)).thenReturn(emptyList);

        List<ProjectSummary> result = findAllProjectsUseCase.findAllProjects(query);

        assertTrue(result.isEmpty());
        verify(projectRepository, times(1)).findAll(query);
    }
}