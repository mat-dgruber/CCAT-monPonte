import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  installPrompt: WritableSignal<any> = signal(null);
  private swUpdate = inject(SwUpdate);
  private notificationService = inject(NotificationService);

  constructor() {
    this.initPwaPrompt();
    this.checkUpdates();
  }

  private checkUpdates() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.notificationService.showInfo(
          'Nova versão disponível!',
          0, // Infinite duration until clicked
          {
            label: 'Atualizar Agora',
            callback: () => document.location.reload()
          }
        );
      });
  }

  private initPwaPrompt() {
    console.log('PwaService: Initializing PWA prompt listener');
    
    // Check if event was captured before service init
    if ((window as any).deferredPrompt) {
      console.log('PwaService: Found pre-captured event');
      this.installPrompt.set((window as any).deferredPrompt);
      (window as any).deferredPrompt = null;
    }

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      console.log('PwaService: beforeinstallprompt event fired!');
      this.installPrompt.set(e);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PwaService: App installed');
      this.installPrompt.set(null);
    });
  }

  async installApp() {
    const prompt = this.installPrompt();
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    this.installPrompt.set(null);
  }

  // --- Badging API ---
  async setBadge(count: number) {
    if ('setAppBadge' in navigator) {
      try {
        await (navigator as any).setAppBadge(count);
      } catch (e) {
        console.error('Error setting badge:', e);
      }
    }
  }

  async clearBadge() {
    if ('clearAppBadge' in navigator) {
      try {
        await (navigator as any).clearAppBadge();
      } catch (e) {
        console.error('Error clearing badge:', e);
      }
    }
  }

  // --- Screen Wake Lock API ---
  private wakeLock: any = null;

  async requestWakeLock(): Promise<boolean> {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          console.log('Wake Lock released');
          this.wakeLock = null;
        });
        console.log('Wake Lock active');
        return true;
      } catch (err) {
        console.error(`${err} - Wake Lock request failed`);
        return false;
      }
    }
    return false;
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
  }
}
