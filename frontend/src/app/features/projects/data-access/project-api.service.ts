import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectResponse, ProjectUpdateRequest } from '../domain/project.models';

import { ProjectStatus, ProjectRequest } from '../domain/project.models';
export type { ProjectStatus, ProjectRequest } from '../domain/project.models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  createProject(project: ProjectRequest): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(`${this.API}/projects`, project);
  }

  getProjects(limit?: number): Observable<ProjectResponse[]> {
    return this.http.get<ProjectResponse[]>(`${this.API}/projects`, { params: limit === undefined ? {} : { limit } });
  }

  getProjectById(id: number): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${this.API}/projects/${id}`);
  }

  updateProject(id: number, dto: ProjectUpdateRequest): Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`${this.API}/projects/${id}`, dto);
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/projects/${id}`);
  }
}
