import { Routes } from '@angular/router';
export const PROJECT_ROUTES: Routes = [
 {path: '', pathMatch: 'full', loadComponent: () => import('./pages/project-list/project-list.component').then(m => m.ProjectListComponent)},
 {path: 'new', loadComponent: () => import('./pages/project-create/project-create.component').then(m => m.ProjectCreateComponent)},
 {path: ':projectId/edit', loadComponent: () => import('./pages/project-edit/update-project.component').then(m => m.UpdateProjectComponent)},
 {path: ':projectId/tasks', loadChildren: () => import('../tasks/tasks.routes').then(m => m.TASK_ROUTES)},
];
