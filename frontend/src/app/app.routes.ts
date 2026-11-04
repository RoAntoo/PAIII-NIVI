import { Routes } from '@angular/router';
export const routes: Routes = [
 {path: '', pathMatch: 'full', loadComponent: () => import('./features/home/pages/home/home.component').then(m => m.HomeComponent)},
 {path: 'projects', loadChildren: () => import('./features/projects/projects.routes').then(m => m.PROJECT_ROUTES)},
 {path: '**', redirectTo: ''},
];
