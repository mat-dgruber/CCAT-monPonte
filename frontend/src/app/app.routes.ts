import { Routes } from '@angular/router';
import { authGuard } from './services/guards/auth.guard';
import { loggedInGuard } from './services/guards/logged-in.guard';
import { LayoutComponent } from './layout/layout';
import { LoginComponent } from './login/login';
import { SignupComponent } from './signup/signup';

export const routes: Routes = [
     {path: 'login', loadComponent: () => import('./login/login').then(m => m.LoginComponent), canActivate: [loggedInGuard]},
     {path: 'signup', loadComponent: () => import('./signup/signup').then(m => m.SignupComponent), canActivate: [loggedInGuard]},
     {
          path: '',
          component: LayoutComponent,
          canActivate: [authGuard],
          children: [
               {path: 'clip', loadComponent: () => import('./clip/clip').then(m => m.Clip)},
               {
                 path: 'notebooks',
                 loadComponent: () => import('./notebooks/notebooks').then(m => m.Notebooks)
               },
          ]
     },
     {path: '', redirectTo: 'login', pathMatch: 'full'}
];
