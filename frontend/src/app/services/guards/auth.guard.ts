import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

/**
 * Guarda de rota funcional para verificar se o usuário está autenticado.
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    take(1), // Pega o primeiro valor emitido (o estado atual) e finaliza a inscrição.
    map(user => {
      // Se o usuário existe (está logado), permite o acesso.
      if (user) {
        return true;
      }

      // Se não há usuário, cria uma UrlTree para redirecionar para a página de login.
      console.log('Acesso negado pela guarda de rota. Redirecionando para /login');
      return router.createUrlTree(['/login']);
    })
  );
};
