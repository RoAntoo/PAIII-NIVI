export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED';

export interface ProjectRequest {
  id: null;
  name: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  description?: string;
}

export interface ProjectUpdateRequest {
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface ProjectResponse {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  description?: string;
  totalTasks: number;
  completedTasks: number;
}
