import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  private authService = inject(AuthService);

  email: string = ''
  password: string = ''
  rememberMe: boolean = false

  async onLogin() {
    try {
      await this.authService.login(this.email, this.password, this.rememberMe);
      console.log('Login successful');
    } catch (e) {
      console.error('Login failed', e);
    }
  }
}
