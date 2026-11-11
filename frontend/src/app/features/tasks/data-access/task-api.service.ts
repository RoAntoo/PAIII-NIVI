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

  /** Fetches recent tasks with project context and legacy metadata defaults. */
  getRecentTasks(): Observable<{task: TaskResponse; projectId: number; projectName: string}[]> {
    return this.http.get<{task: TaskDto; projectId: number; projectName: string}[]>(this.baseUrl + '/projects/recent-tasks')
      .pipe(timeout(15000), map(rows => rows.map(row => ({ ...row, task: taskFromDto(row.task) }))));
  }

  /** Validates and creates one task; a timeout leaves the server outcome unknown. */
  createTask(projectId: number, task: TaskRequest): Observable<TaskResponse> {
    return defer(() => {
      validateTaskInput(task);
      const dto = { ...task, title: task.title.trim(), source: task.source ?? 'MANUAL', category: task.category ?? 'GENERAL' };
      return this.http.post<TaskDto>(`${this.baseUrl}/projects/${projectId}/tasks`, dto);
    }).pipe(timeout(15000), map(taskFromDto));
  }

  /** Lists project tasks and normalizes metadata omitted by older servers. */
  getTasksByProjectId(projectId: number | string): Observable<TaskResponse[]> {
    return this.http.get<TaskDto[]>(`${this.baseUrl}/projects/${projectId}/tasks`)
      .pipe(timeout(15000), map(tasks => tasks.map(taskFromDto)));
  }

  /** Fetches a task within its parent project, preserving all response fields. */
  getTask(projectId: number, taskId: number): Observable<TaskResponse> {
    return this.http.get<TaskDto>(`${this.baseUrl}/projects/${projectId}/tasks/${taskId}`)
      .pipe(timeout(15000), map(taskFromDto));
  }

  /** Validates and sends only supplied changes, preserving omitted server fields. */
  updateTask(projectId: number, taskId: number, dto: UpdateTaskDto): Observable<TaskResponse> {
    return defer(() => {
      validateTaskInput(dto);
      return this.http.put<TaskDto>(`${this.baseUrl}/projects/${projectId}/tasks/${taskId}`,
        { ...dto, ...(dto.title !== undefined ? { title: dto.title.trim() } : {}) });
    }).pipe(timeout(15000), map(taskFromDto));
  }

  /** Deletes a task within its project and propagates HTTP failures to the caller. */
  deleteTask(projectId: number, taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${projectId}/tasks/${taskId}`).pipe(timeout(15000));
  }
}
