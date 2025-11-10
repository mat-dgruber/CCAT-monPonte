import { Routes } from '@angular/router';
import { authGuard } from './services/guards/auth.guard';
import { loggedInGuard } from './services/guards/logged-in.guard';
import { LayoutComponent } from './layout/layout';
import { TermsOfUseComponent } from './terms-of-use/terms-of-use';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy';
import { LoginComponent } from './login/login';
import { SignupComponent } from './signup/signup';

export const routes: Routes = [
     {path: 'login', loadComponent: () => import('./login/login').then(m => m.LoginComponent), canActivate: [loggedInGuard]},
     {path: 'signup', loadComponent: () => import('./signup/signup').then(m => m.SignupComponent), canActivate: [loggedInGuard]},
     {path: 'forgot-password', loadComponent: () => import('./forgot-password/forgot-password').then(m => m.ForgotPasswordComponent), canActivate: [loggedInGuard]},
     {path: 'terms-of-use', loadComponent: () => import('./terms-of-use/terms-of-use').then(m => m.TermsOfUseComponent)},
     {path: 'privacy-policy', loadComponent: () => import('./privacy-policy/privacy-policy').then(m => m.PrivacyPolicyComponent)},
     {path: 'bug-report', loadComponent: () => import('./bug-report/bug-report').then(m => m.BugReportComponent)},
     {
          path: '',
          component: LayoutComponent,
          canActivate: [authGuard],
          children: [
               { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
               {path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent)},
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
