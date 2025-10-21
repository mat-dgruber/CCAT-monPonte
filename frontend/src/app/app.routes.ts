import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Signup } from './signup/signup';
import { Clip } from './clip/clip';
import { Notebooks } from './notebooks/notebooks'; 
import { authGuard } from './services/guards/auth.guard';
import { loggedInGuard } from './services/guards/logged-in.guard';

export const routes: Routes = [
     {path: 'login', component: Login, canActivate: [loggedInGuard]},
     {path: 'signup', component: Signup, canActivate: [loggedInGuard]},
     {path: 'clip', component: Clip, canActivate: [authGuard]},
     {path: 'notebooks', component: Notebooks, canActivate: [authGuard]},
     {path: '', redirectTo: 'login', pathMatch: 'full'}
];
