import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, map, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';

import { TaskStatus, TaskRequest, TaskResponse, UpdateTaskDto } from '../domain/task.models';
import { TaskDto, taskFromDto, validateTaskInput } from '../domain/task.models';
export type { TaskStatus, TaskRequest, TaskResponse, UpdateTaskDto } from '../domain/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getRecentTasks(): Observable<{task: TaskResponse; projectId: number; projectName: string}[]> {
    return this.http.get<{task: TaskDto; projectId: number; projectName: string}[]>(this.baseUrl + '/projects/recent-tasks')
      .pipe(timeout(15000), map(rows => rows.map(row => ({ ...row, task: taskFromDto(row.task) }))));
  }

  createTask(projectId: number, task: TaskRequest): Observable<TaskResponse> {
    return defer(() => {
      validateTaskInput(task);
      const dto = { ...task, title: task.title.trim(), source: task.source ?? 'MANUAL', category: task.category ?? 'GENERAL' };
      return this.http.post<TaskDto>(`${this.baseUrl}/projects/${projectId}/tasks`, dto);
    }).pipe(timeout(15000), map(taskFromDto));
  }

  getTasksByProjectId(projectId: number | string): Observable<TaskResponse[]> {
    return this.http.get<TaskDto[]>(`${this.baseUrl}/projects/${projectId}/tasks`)
      .pipe(timeout(15000), map(tasks => tasks.map(taskFromDto)));
  }

  getTask(projectId: number, taskId: number): Observable<TaskResponse> {
    return this.http.get<TaskDto>(`${this.baseUrl}/projects/${projectId}/tasks/${taskId}`)
      .pipe(timeout(15000), map(taskFromDto));
  }

  updateTask(projectId: number, taskId: number, dto: UpdateTaskDto): Observable<TaskResponse> {
    return defer(() => {
      validateTaskInput(dto);
      return this.http.put<TaskDto>(`${this.baseUrl}/projects/${projectId}/tasks/${taskId}`,
        { ...dto, ...(dto.title !== undefined ? { title: dto.title.trim() } : {}) });
    }).pipe(timeout(15000), map(taskFromDto));
  }

  deleteTask(projectId: number, taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${projectId}/tasks/${taskId}`).pipe(timeout(15000));
  }
}
