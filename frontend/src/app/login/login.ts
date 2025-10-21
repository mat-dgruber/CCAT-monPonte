import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  private authService = inject(AuthService);

  email: string = ''
  password: string = ''

  async onLogin() {
    try {
      await this.authService.login(this.email, this.password);
      console.log('Login successful');
    } catch (error) {
      console.error('Login failed', error);
    }
  }

}
