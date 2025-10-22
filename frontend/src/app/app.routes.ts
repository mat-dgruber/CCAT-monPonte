import { Routes } from '@angular/router';
import { authGuard } from './services/guards/auth.guard';
import { loggedInGuard } from './services/guards/logged-in.guard';

export const routes: Routes = [
     {path: 'login', loadComponent: () => import('./login/login').then(m => m.Login), canActivate: [loggedInGuard]},
     {path: 'signup', loadComponent: () => import('./signup/signup').then(m => m.Signup), canActivate: [loggedInGuard]},
     {path: 'clip', loadComponent: () => import('./clip/clip').then(m => m.Clip), canActivate: [authGuard]},
     {path: 'notebooks', loadComponent: () => import('./notebooks/notebooks').then(m => m.Notebooks), canActivate: [authGuard]},
     {path: '', redirectTo: 'login', pathMatch: 'full'}
];
