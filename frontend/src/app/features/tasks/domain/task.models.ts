export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface TaskRequest {
  id: null;
  title: string;
  estimateHours: number;
  assignee: string | null;
  status: TaskStatus;
}

export interface TaskResponse {
  id: number;
  title: string;
  estimateHours: number;
  assignee: string | null;
  status: TaskStatus;
  createdAt: string;
  finishedAt: string | null;
}

export interface UpdateTaskDto {
  title: string;
  estimateHours: number;
  assignee: string | null;
}

