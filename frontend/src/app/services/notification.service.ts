import { Injectable, signal, inject } from '@angular/core';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  toasts = signal<Toast[]>([]);
  private messaging = inject(Messaging);

  constructor() {
    this.listenForMessages();
  }

  async requestPermission(): Promise<void> {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messaging, { vapidKey: 'YOUR_VAPID_KEY_HERE' }); // User needs to replace this
        console.log('Notification Token:', token);
        this.showSuccess('Notificações ativadas! (Token no console)');
      } else {
        this.showError('Permissão para notificações negada.');
      }
    } catch (e) {
      console.error(e);
      this.showError('Erro ao ativar notificações.');
    }
  }

  private listenForMessages() {
    try {
      onMessage(this.messaging, (payload) => {
        console.log('Message received. ', payload);
        const notificationTitle = payload.notification?.title || 'Nova Mensagem';
        const notificationOptions = payload.notification?.body || '';
        this.showInfo(`${notificationTitle}: ${notificationOptions}`);
      });
    } catch (e) {
      // Messaging might not be supported in some envs
      console.warn('Messaging not supported (or sw not ready)');
    }
  }

  showSuccess(message: string, duration = 3000) {
    this.addToast(message, 'success', duration);
  }

  showError(message: string, duration = 5000) {
    this.addToast(message, 'error', duration);
  }

  showInfo(message: string, duration = 3000, action?: { label: string, callback: () => void }) {
    this.addToast(message, 'info', duration, action);
  }

  private addToast(message: string, type: ToastType, duration: number, action?: { label: string, callback: () => void }) {
    const id = Math.random().toString(36).substring(2, 9);
    this.toasts.update(currentToasts => [
      ...currentToasts,
      { id, message, type, duration, action }
    ]);

    if (duration > 0) { // Allow infinite duration if 0
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  remove(toastId: string) {
    this.toasts.update(currentToasts => currentToasts.filter(toast => toast.id !== toastId));
  }
}