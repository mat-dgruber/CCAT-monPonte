import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

/**
 * Guarda de rota para impedir que usuários logados acessem páginas como /login e /signup.
 */
export const loggedInGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    take(1), // Pega o estado de autenticação atual e finaliza.
    map(user => {
      // Se o usuário JÁ EXISTE (está logado), redireciona para /clip.
      if (user) {
        console.log('Usuário já logado. Redirecionando para /clip...');
        return router.createUrlTree(['/clip']);
      }
      // Se não há usuário, permite o acesso à rota de login/signup.
      return true;
    })
  );
};