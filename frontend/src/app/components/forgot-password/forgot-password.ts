import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthError } from '@angular/fire/auth';
import { LoggingService } from '../../services/logging';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css'],
})
export class ForgotPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private loggingService = inject(LoggingService);

  ngOnInit(): void {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async onResetPassword() {
    if (this.resetForm.invalid) {
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;
    const { email } = this.resetForm.value;

    try {
      await this.authService.sendPasswordResetEmail(email);
      this.successMessage = 'Um link para redefinição de senha foi enviado para o seu e-mail.';
      this.resetForm.reset();
    } catch (e) {
      const error = e as AuthError;
      this.errorMessage = 'Ocorreu um erro ao enviar o e-mail. Verifique o endereço e tente novamente.';
      this.loggingService.error('Password reset failed', error);
    } finally {
      this.isLoading = false;
    }
  }

  get email() { return this.resetForm.get('email'); }
}
