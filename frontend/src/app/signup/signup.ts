import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {

  private authService = inject(AuthService);

  email: string = ''
  password: string = ''

  async onSignup() {
    try {
      await this.authService.signup(this.email, this.password);
      console.log('Signup successful');
    } catch (error) {
      console.error('Signup failed', error);
    }
  }


}
