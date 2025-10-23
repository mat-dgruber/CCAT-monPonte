import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthError } from '@angular/fire/auth';

import { AuthService } from '../services/auth';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
})
export class SignupComponent {
  name = '';
  email = '';
  password = '';
  errorMessage: string | null = null;
  isLoading = false;

  private authService = inject(AuthService);
  private router = inject(Router);

  async onSignup() {
    // Safeguard against submission with empty fields
    if (!this.name || !this.email || !this.password) {
      return;
    }

    this.errorMessage = null;
    this.isLoading = true;
    try {
      await this.authService.signup(this.name, this.email, this.password);
      this.router.navigate(['/']); // Navigate to the main app upon successful signup
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
      case 'auth/email-already-in-use':
        return 'Este endereço de e-mail já está em uso por outra conta.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Por favor, use uma senha com pelo menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'O endereço de e-mail fornecido não é válido.';
      default:
        return 'Ocorreu um erro inesperado ao criar a conta. Tente novamente.';
    }
  }
}