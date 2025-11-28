import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthError } from '@angular/fire/auth'; 
import { LoggingService } from '../../services/logging'; 
import { AuthService } from '../../services/auth';

// Helper function for delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;
  showPassword = false;
  loginAttempts = 0;
  isLocked = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private loggingService = inject(LoggingService);

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  async onLogin() {
    if (this.isLocked || this.loginForm.invalid) {
      return;
    }

    this.errorMessage = null;
    this.isLoading = true;
    const { email, password, rememberMe } = this.loginForm.value;
    const minLoadingTime = delay(1000); // Minimum 1 second loading time

    try {
      await this.authService.login(email, password, rememberMe);

      if (!this.authService.isEmailVerified) {
        await this.authService.logout();
        this.errorMessage = 'Por favor, verifique seu e-mail antes de fazer login.';
        await minLoadingTime;
        return;
      }

      await minLoadingTime; // Ensure spinner is shown for at least minLoadingTime
      this.loginAttempts = 0; // Reset on success
      this.router.navigate(['/']);
    } catch (e) {
      const error = e as AuthError;
      this.errorMessage = this.getFriendlyErrorMessage(error);
      this.loginAttempts++;
      if (this.loginAttempts >= 5) {
        this.lockForm();
      }
      this.loggingService.error('Login failed', error);
      await minLoadingTime; // Ensure spinner is shown for at least minLoadingTime even on error
    } finally {
      this.isLoading = false;
    }
  }

  private lockForm() {
    this.isLocked = true;
    this.errorMessage = 'Muitas tentativas de login. Tente novamente em 30 segundos.';
    this.loginForm.disable();
    setTimeout(() => {
      this.isLocked = false;
      this.loginAttempts = 0;
      this.errorMessage = null;
      this.loginForm.enable();
    }, 30000); // 30 seconds
  }

  private getFriendlyErrorMessage(error: AuthError): string {
    switch (error.code) {
      case 'auth/invalid-credential':
        return 'E-mail ou senha inválidos. Por favor, tente novamente.';
      case 'auth/user-not-found':
        return 'Nenhum usuário encontrado com este e-mail.';
      default:
        return 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.';
    }
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}
