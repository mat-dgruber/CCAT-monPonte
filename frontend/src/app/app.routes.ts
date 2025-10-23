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
               { path: '', redirectTo: 'notebooks', pathMatch: 'full' },
               {path: 'clip', loadComponent: () => import('./clip/clip').then(m => m.Clip)},
               {
                 path: 'notebooks',
                 loadComponent: () => import('./notebooks/notebooks').then(m => m.Notebooks)
               ,
                 children: [
                   { path: ':notebookId/notes/:noteId', loadComponent: () => import('./note-editor/note-editor').then(m => m.NoteEditor) }
                 ]},
              {path: 'settings', loadComponent: () => import('./settings/settings').then(m => m.SettingsComponent)},
          ]
     },
     {path: '', redirectTo: 'login', pathMatch: 'full'}
];
