import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthError } from '@angular/fire/auth';
import { LoggingService } from '../../services/logging';
import { AuthService } from '../../services/auth';

// Custom validator to check if passwords match
export function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  return password && confirmPassword && password.value !== confirmPassword.value ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  errorMessage: string | null = null;
  emailExistsError = false;
  isLoading = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private loggingService = inject(LoggingService);

  ngOnInit(): void {
    this.signupForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern('(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}')
      ]],
      confirmPassword: ['', Validators.required],
      termsAccepted: [false, Validators.requiredTrue]
    }, { validators: passwordsMatchValidator });
  }

  async onSignup() {
    if (this.signupForm.invalid) {
      return;
    }

    this.errorMessage = null;
    this.emailExistsError = false;
    this.isLoading = true;
    const { name, email, password } = this.signupForm.value;

    try {
      const userCredential = await this.authService.signup(name, email, password);
      await this.authService.sendVerificationEmail(userCredential.user);
      await this.authService.logout();
      alert('Conta criada com sucesso! Verifique seu e-mail para ativar sua conta antes de fazer login.');
      this.router.navigate(['/login']);
    } catch (e) {
      const error = e as AuthError;
      if (error.code === 'auth/email-already-in-use') {
        this.emailExistsError = true;
        this.errorMessage = null;
      } else {
        this.errorMessage = this.getFriendlyErrorMessage(error);
      }
      this.loggingService.error('Signup failed', error);
    } finally {
      this.isLoading = false;
    }
  }

  private getFriendlyErrorMessage(error: AuthError): string {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso. Tente fazer login.';
      case 'auth/weak-password':
        return 'A senha fornecida é muito fraca.';
      case 'auth/invalid-email':
        return 'O endereço de e-mail fornecido não é válido.';
      default:
        return 'Ocorreu um erro inesperado ao criar a conta. Tente novamente.';
    }
  }

  get name() { return this.signupForm.get('name'); }
  get email() { return this.signupForm.get('email'); }
  get password() { return this.signupForm.get('password'); }
  get confirmPassword() { return this.signupForm.get('confirmPassword'); }
  get termsAccepted() { return this.signupForm.get('termsAccepted'); }
}
