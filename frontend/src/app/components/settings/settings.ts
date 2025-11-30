import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DataService } from '../../services/data.service';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationService } from '../../services/notification.service';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ThemeService } from '../../services/theme';
import { Modal } from '../modal/modal';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FileUploadModule, ToastModule, Modal],
  providers: [MessageService],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private dataService = inject(DataService);
  private messageService = inject(MessageService);
  public themeService = inject(ThemeService);

  currentUser = signal<any>(null); // Using any to avoid strict User type issues for now, or import User correctly
  userPhoto = signal<string | null>(null);

  isDeleting = false;
  isUpdating = false;
  isDeleteModalOpen = false;

  // Form fields
  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  currentPassword = '';
  
  constructor() {
    this.authService.authState$.subscribe(user => {
      this.currentUser.set(user);
      if (user) {
        this.displayName = user.displayName || '';
        this.email = user.email || '';
      }
    });
  }

  ngOnInit() {
    // Load user photo
    this.dataService.getUserPhoto().subscribe(photo => {
      this.userPhoto.set(photo);
    });
  }

  getInitials(displayName: string | null): string {
    if (!displayName) return '?';
    const names = displayName.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    } else {
      return displayName.substring(0, 2).toUpperCase();
    }
  }

  onUpload(event: any) {
    const file = event.files[0];
    if (file) {
      this.resizeImage(file).then(base64 => {
        this.dataService.updateUserPhoto(base64).then(() => {
          this.userPhoto.set(base64);
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Foto de perfil atualizada!' });
        }).catch(error => {
          console.error('Erro ao salvar foto:', error);
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao salvar a foto.' });
        });
      }).catch(error => {
        console.error('Erro ao processar imagem:', error);
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao processar a imagem.' });
      });
    }
  }

  resizeImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxWidth = 150;
          const maxHeight = 150;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async updateName() {
    this.isUpdating = true;
    try {
      await this.authService.updateProfile({ displayName: this.displayName });
      this.notificationService.showSuccess('Nome atualizado com sucesso!');
    } catch (error) {
      this.notificationService.showError('Erro ao atualizar nome.');
    } finally {
      this.isUpdating = false;
    }
  }

  async updateEmail() {
    this.isUpdating = true;
    try {
      await this.authService.updateEmail(this.email);
      this.notificationService.showSuccess('Email atualizado com sucesso!');
    } catch (error) {
      this.notificationService.showError('Erro ao atualizar email. Verifique se você fez login recentemente.');
    } finally {
      this.isUpdating = false;
    }
  }

  async updatePassword() {
    if (this.password !== this.confirmPassword) {
      this.notificationService.showError('As senhas não coincidem.');
      return;
    }
    this.isUpdating = true;
    try {
      await this.authService.updatePassword(this.password);
      this.notificationService.showSuccess('Senha atualizada com sucesso!');
      this.password = '';
      this.confirmPassword = '';
    } catch (error) {
      this.notificationService.showError('Erro ao atualizar senha. Verifique se você fez login recentemente.');
    } finally {
      this.isUpdating = false;
    }
  }

  onThemeChange(event: any) {
    this.themeService.setTheme(event.target.value);
  }

  onFontFamilyChange(event: any) {
    this.themeService.setFontFamily(event.target.value);
  }

  onFontSizeChange(event: any) {
    this.themeService.setFontSize(event.target.value);
  }

  openDeleteModal() {
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout failed:', error);
      this.notificationService.showError('Erro ao sair da conta.');
    }
  }

  async deleteAccount() {
    this.isDeleting = true;
    try {
      await this.authService.deleteAccount();
      this.notificationService.showSuccess('Conta excluída com sucesso.');
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Delete account failed:', error);
      this.notificationService.showError('Falha ao excluir a conta. Tente fazer logout e login novamente.');
    } finally {
      this.isDeleting = false;
      this.closeDeleteModal();
    }
  }
}
