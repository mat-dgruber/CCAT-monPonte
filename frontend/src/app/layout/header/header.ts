import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { Observable } from 'rxjs';
import { DarkModeService } from '../../services/dark-mode.service';
import { User } from 'firebase/auth';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  public darkModeService = inject(DarkModeService);
  public authState$: Observable<User | null> = this.authService.authState$;

  public toggleDarkMode() {
    this.darkModeService.toggleDarkMode();
  }

}
