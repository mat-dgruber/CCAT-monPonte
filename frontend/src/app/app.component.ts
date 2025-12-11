import { Component, inject, HostListener, OnInit } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth';
import { ResponsiveService } from './services/responsive';
import { ThemeService } from './services/theme';
import { PwaService } from './services/pwa.service';
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
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private responsiveService = inject(ResponsiveService);
  private themeService = inject(ThemeService); 
  private pwaService = inject(PwaService); // PwaService initializes listener
  authState$: Observable<User | null> = this.authService.authState$;

  constructor() {
    this.responsiveService.setIsMobile(window.innerWidth < 768);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.responsiveService.setIsMobile(window.innerWidth < 768);
  }

  async logout() {
    await this.authService.logout();
  }
  
  // Protocol Handler Logic
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const link = params['link'];
      if (link) {
         // Handle deep link logic here. 
         // Example: web+monclip://note/123 -> link=web+monclip://note/123 (depending on implementation, usually browser sends the whole URI as %s)
         // Actually, standard is: url?link=web+monclip%3A%2F%2Fnote%2F123
         
         const decoded = decodeURIComponent(link);
         if (decoded.startsWith('web+monclip://')) {
             const path = decoded.replace('web+monclip://', '');
             // Simple routing: if path is "note/123", go to that.
             // If path is "clip", go to clip.
             // We can just try to navigate to /path checking if it is valid or handle specific cases.
             this.router.navigateByUrl('/' + path);
         }
      }
    });
  }
}
