import { Injectable, isDevMode } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {

  error(message: string, error?: any): void {
    if (isDevMode()) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }

  log(message: string, data?: any): void {
    if (isDevMode()) {
      console.log(message, data);
    }
  }
}
