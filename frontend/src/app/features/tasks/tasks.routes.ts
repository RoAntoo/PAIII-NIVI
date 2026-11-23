import { CanDeactivateFn, Routes } from '@angular/router';
import type { VoiceTasksComponent } from './pages/task-voice/voice-tasks.component';
import type { TaskImportComponent } from './pages/task-import/task-import.component';

const protectSave: CanDeactivateFn<VoiceTasksComponent | TaskImportComponent> = (component, _route, _current, next) =>
  next.root.firstChild?.routeConfig?.path === 'login' || !component.saving() || component.pendingCount() === 0;

const importComponent = () => import('./pages/task-import/task-import.component').then(m => m.TaskImportComponent);

export const TASK_ROUTES: Routes = [
 {path: '', pathMatch: 'full', loadComponent: () => import('./pages/task-list/task-list.component').then(m => m.TaskListComponent)},
 {path: 'new', loadComponent: () => import('./pages/task-create/create-task.component').then(m => m.CreateTaskComponent)},
 {
   path: 'voice',
   loadComponent: () => import('./pages/task-voice/voice-tasks.component').then(m => m.VoiceTasksComponent),
   canDeactivate: [protectSave],
 },
 {path: 'ocr', data: {source: 'OCR'}, loadComponent: importComponent, canDeactivate: [protectSave]},
 {path: 'qr', data: {source: 'QR'}, loadComponent: importComponent, canDeactivate: [protectSave]},
 {path: ':taskId/edit', loadComponent: () => import('./pages/task-edit/update-task.component').then(m => m.UpdateTaskComponent)},
];
