import { Routes } from '@angular/router';
export const TASK_ROUTES: Routes = [
 {path: '', pathMatch: 'full', loadComponent: () => import('./pages/task-list/task-list.component').then(m => m.TaskListComponent)},
 {path: 'new', loadComponent: () => import('./pages/task-create/create-task.component').then(m => m.CreateTaskComponent)},
 {path: ':taskId/edit', loadComponent: () => import('./pages/task-edit/update-task.component').then(m => m.UpdateTaskComponent)},
];
