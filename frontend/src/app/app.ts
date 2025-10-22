import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common'; // Necessário para @if e async pipe
import { AuthService } from './services/auth';
import { Observable } from 'rxjs';
import { User } from 'firebase/auth';

@Component({
  selector: 'app-root',
  standalone: true, // standalone já estava, mantemos
  imports: [
    RouterOutlet,
    CommonModule  // Adicionado para a diretiva @if e o pipe async
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent { // Renomeado de App para AppComponent por convenção
  // 1. Injeta o AuthService e expõe o authState$
  private authService = inject(AuthService);
  authState$: Observable<User | null> = this.authService.authState$;

  // 2. Cria o método logout
  async logout() {
    await this.authService.logout();
  }
}
