import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
export const routes: Routes = [
 {path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)},
 {path: '', pathMatch: 'full', canActivate: [authGuard], loadComponent: () => import('./features/home/pages/home/home.component').then(m => m.HomeComponent)},
 {path: 'projects', canActivate: [authGuard], loadChildren: () => import('./features/projects/projects.routes').then(m => m.PROJECT_ROUTES)},
 {path: 'settings', canActivate: [authGuard], loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)},
 {path: '**', redirectTo: ''},
];
