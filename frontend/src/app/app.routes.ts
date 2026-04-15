import { Routes } from '@angular/router';
import { authGuard } from './services/guards/auth.guard';
import { loggedInGuard } from './services/guards/logged-in.guard';
import { LayoutComponent } from './components/layout/layout';
import { TermsOfUseComponent } from './components/terms-of-use/terms-of-use';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy';
import { LoginComponent } from './components/login/login';
import { SignupComponent } from './components/signup/signup';

export const routes: Routes = [
     {path: 'login', loadComponent: () => import('./components/login/login').then(m => m.LoginComponent), canActivate: [loggedInGuard]},
     {path: 'signup', loadComponent: () => import('./components/signup/signup').then(m => m.SignupComponent), canActivate: [loggedInGuard]},
     {path: 'forgot-password', loadComponent: () => import('./components/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent), canActivate: [loggedInGuard]},
     {path: 'terms-of-use', loadComponent: () => import('./components/terms-of-use/terms-of-use').then(m => m.TermsOfUseComponent)},
     {path: 'privacy-policy', loadComponent: () => import('./components/privacy-policy/privacy-policy').then(m => m.PrivacyPolicyComponent)},
     {path: 'bug-report', loadComponent: () => import('./components/bug-report/bug-report').then(m => m.BugReportComponent)},
     {path: 'share-target', loadComponent: () => import('./components/share-target/share-target').then(m => m.ShareTargetComponent)},
     {path: 'widget', loadComponent: () => import('./components/widget/widget').then(m => m.WidgetComponent)},
     {
          path: '',
          component: LayoutComponent,
          canActivate: [authGuard],
          children: [
               { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
               {path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent)},
               {path: 'clip', loadComponent: () => import('./components/clip/clip').then(m => m.Clip)},
               {
                 path: 'notebooks',
                 loadComponent: () => import('./components/notebooks/notebooks').then(m => m.Notebooks)
               ,
                 children: [
                   { path: ':notebookId/notes/:noteId', loadComponent: () => import('./components/note-editor/note-editor').then(m => m.NoteEditor), runGuardsAndResolvers: 'always' }
                 ]},
              {path: 'settings', loadComponent: () => import('./components/settings/settings').then(m => m.SettingsComponent)},
          ]
     },
     {path: '', redirectTo: 'login', pathMatch: 'full'}
];
