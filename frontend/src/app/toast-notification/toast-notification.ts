import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService } from '../services/notification.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './toast-notification.html',
  styleUrls: ['./toast-notification.css'],
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class ToastNotificationComponent {
  notificationService = inject(NotificationService);
}