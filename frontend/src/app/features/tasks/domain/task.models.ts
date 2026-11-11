export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export const TASK_CATEGORIES = ['GENERAL', 'COMPRAS', 'SALUD', 'ESTUDIO', 'TRABAJO', 'OTRA'] as const;
export type TaskCategory = typeof TASK_CATEGORIES[number];
export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  GENERAL: 'General', COMPRAS: 'Compras', SALUD: 'Salud', ESTUDIO: 'Estudio', TRABAJO: 'Trabajo', OTRA: 'Otra',
};
export type TaskSource = 'MANUAL' | 'VOZ' | 'OCR' | 'QR';

export interface TaskRequest {
  id: null;
  title: string;
  estimateHours: number;
  assignee: string | null;
  status: TaskStatus;
  source?: TaskSource;
  category?: TaskCategory;
  clientRequestId?: string;
}

export interface TaskResponse {
  id: number;
  title: string;
  estimateHours: number;
  assignee: string | null;
  status: TaskStatus;
  createdAt: string;
  finishedAt: string | null;
  projectId?: number;
  source: TaskSource;
  category: TaskCategory;
  clientRequestId?: string | null;
}

/** HTTP data can predate the additive PR01 metadata. Preserve all original fields. */
export type TaskDto = Omit<TaskResponse, 'source' | 'category'> & {
  source?: TaskSource | null; category?: TaskCategory | null;
};

export function taskFromDto(dto: TaskDto): TaskResponse {
  return { ...dto, source: dto.source ?? 'MANUAL', category: dto.category ?? 'GENERAL' };
}

export interface UpdateTaskDto {
  title?: string;
  estimateHours?: number;
  assignee?: string | null;
  status?: TaskStatus;
  category?: TaskCategory;
}

export function validateTaskInput(input: TaskRequest | UpdateTaskDto): void {
  if (input.title !== undefined && (!input.title.trim() || input.title.length > 255)) {
    throw new Error('El título es obligatorio y admite hasta 255 caracteres.');
  }
  if (input.estimateHours !== undefined && (!Number.isInteger(input.estimateHours)
      || input.estimateHours < 1 || input.estimateHours > 2147483647)) {
    throw new Error('Las horas deben ser un entero entre 1 y 2147483647.');
  }
  if (input.assignee != null && input.assignee.length > 255) throw new Error('El responsable admite hasta 255 caracteres.');
  if (input.category !== undefined && !TASK_CATEGORIES.includes(input.category)) throw new Error('Categoría inválida.');
  if (input.status !== undefined && !['TODO', 'IN_PROGRESS', 'DONE'].includes(input.status)) throw new Error('Estado inválido.');
  if ('source' in input && input.source !== undefined && !['MANUAL', 'VOZ', 'OCR', 'QR'].includes(input.source)) {
    throw new Error('Origen inválido.');
  }
}

