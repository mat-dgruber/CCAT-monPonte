import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthError } from '@angular/fire/auth';

import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent {
  email = '';
  password = '';
  rememberMe = false;
  errorMessage: string | null = null;
  isLoading = false;
  showPassword = false; // New property

  private authService = inject(AuthService);
  private router = inject(Router);

  toggleShowPassword() { // New method
    this.showPassword = !this.showPassword;
  }

  async onLogin() {
    // Safeguard against submission with empty fields
    if (!this.email || !this.password) {
      return;
    }

    this.errorMessage = null;
    this.isLoading = true;
    try {
      await this.authService.login(this.email, this.password, this.rememberMe);
      this.router.navigate(['/']);
    } catch (e) {
      const error = e as AuthError;
      this.errorMessage = this.getFriendlyErrorMessage(error);
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  private getFriendlyErrorMessage(error: AuthError): string {
    switch (error.code) {
      case 'auth/invalid-credential':
        return 'E-mail ou senha inválidos. Por favor, tente novamente.';
      case 'auth/user-not-found': // This is often covered by invalid-credential
        return 'Nenhum usuário encontrado com este e-mail.';
      default:
        return 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.';
    }
  }
}