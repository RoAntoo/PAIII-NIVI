import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

import { TaskStatus, TaskRequest, TaskResponse, UpdateTaskDto } from '../domain/task.models';
export type { TaskStatus, TaskRequest, TaskResponse, UpdateTaskDto } from '../domain/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getRecentTasks(): Observable<{task: TaskResponse; projectId: number; projectName: string}[]> {
    return this.http.get<{task: TaskResponse; projectId: number; projectName: string}[]>(this.baseUrl + '/projects/recent-tasks');
  }

  createTask(projectId: number, task: TaskRequest): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(`${this.baseUrl}/projects/${projectId}/tasks`, task);
  }

  getTasksByProjectId(projectId: number | string): Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(`${this.baseUrl}/projects/${projectId}/tasks`);
  }

  getTask(projectId: number, taskId: number): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`${this.baseUrl}/projects/${projectId}/tasks/${taskId}`);
  }

  updateTask(projectId: number, taskId: number, dto: UpdateTaskDto): Observable<TaskResponse> {
    return this.http.put<TaskResponse>(`${this.baseUrl}/projects/${projectId}/tasks/${taskId}`, dto);
  }
}