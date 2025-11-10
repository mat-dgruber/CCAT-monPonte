import { Injectable, isDevMode } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {

  error(message: string, error?: any): void {
    if (isDevMode()) {
      console.error(message, error);
    } else {
      // Em produção, apenas logamos uma mensagem genérica e evitamos o objeto de erro.
      // Aqui seria o local para integrar com um serviço de monitoramento externo (Sentry, etc.)
      console.error(message);
    }
  }

  log(message: string, data?: any): void {
    if (isDevMode()) {
      console.log(message, data);
    }
  }
}
