import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ClipService } from '../../services/clip.service';
import { ThemeService, Theme, FontFamily } from '../../services/theme';
import { FormsModule } from '@angular/forms';
import { User } from 'firebase/auth';
import { NotificationService } from '../../services/notification.service';
import { Modal } from '../modal/modal';
import { TutorialService } from '../../services/tutorial.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, LucideAngularModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private tutorialService = inject(TutorialService);
  clipService = inject(ClipService);
  themeService = inject(ThemeService);

  user: User | null = null;
  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  currentPassword = '';

  isUpdating = false;
  isDeleting = false;
  isDeleteModalOpen = false;

  ngOnInit() {
    this.authService.authState$.subscribe(user => {
      if (user) {
        this.user = user;
        this.displayName = user.displayName || '';
        this.email = user.email || '';
      }
    });
  }

  public async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
      this.notificationService.showSuccess('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Logout failed:', error);
      this.notificationService.showError('Falha ao fazer logout.');
    }
  }

  // --- Theme and Editor Settings ---
  onThemeChange(event: Event) {
    const selectedTheme = (event.target as HTMLInputElement).value as Theme;
    this.themeService.setTheme(selectedTheme);
  }

  toggleNotebookStyle() {
    this.themeService.toggleNotebookStyle();
  }

  onFontFamilyChange(event: Event) {
    const selectedFont = (event.target as HTMLSelectElement).value as FontFamily;
    this.themeService.setFontFamily(selectedFont);
  }

  onFontSizeChange(event: Event) {
    const size = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(size) && size >= 12 && size <= 24) {
      this.themeService.setFontSize(size);
    }
  }

  // --- Notifications ---
  async requestNotificationPermission() {
    await this.notificationService.requestPermission();
  }

  // --- Account Settings ---
  async updateName() {
    if (!this.user || !this.displayName.trim()) {
      this.notificationService.showError('O nome não pode estar vazio.');
      return;
    }
    this.isUpdating = true;
    try {
      await this.authService.updateProfile({ displayName: this.displayName });
      this.notificationService.showSuccess('Nome atualizado com sucesso!');
    } catch (error) {
      console.error('Update name failed:', error);
      this.notificationService.showError('Falha ao atualizar o nome.');
    } finally {
      this.isUpdating = false;
    }
  }

  // --- Security Settings ---
  async updateEmail() {
    if (!this.user || !this.email.trim()) {
      this.notificationService.showError('O e-mail não pode estar vazio.');
      return;
    }
    if (!this.currentPassword) {
      this.notificationService.showError('Por favor, insira sua senha atual para alterar o e-mail.');
      return;
    }

    this.isUpdating = true;
    try {
      await this.authService.reauthenticate(this.currentPassword);
      await this.authService.updateEmail(this.email);
      this.notificationService.showSuccess('E-mail atualizado com sucesso! Um e-mail de verificação foi enviado.');
      this.currentPassword = '';
    } catch (error) {
      console.error('Update email failed:', error);
      this.notificationService.showError('Falha ao atualizar o e-mail. Verifique sua senha atual.');
    } finally {
      this.isUpdating = false;
    }
  }

  async updatePassword() {
    if (!this.user || !this.password) {
      this.notificationService.showError('A nova senha não pode estar vazia.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.notificationService.showError('As senhas não coincidem.');
      return;
    }
    if (!this.currentPassword) {
      this.notificationService.showError('Por favor, insira sua senha atual.');
      return;
    }

    this.isUpdating = true;
    try {
      await this.authService.reauthenticate(this.currentPassword);
      await this.authService.updatePassword(this.password);
      this.notificationService.showSuccess('Senha atualizada com sucesso!');
      this.password = '';
      this.confirmPassword = '';
      this.currentPassword = '';
    } catch (error) {
      console.error('Update password failed:', error);
      this.notificationService.showError('Falha ao atualizar a senha. Verifique sua senha atual.');
    } finally {
      this.isUpdating = false;
    }
  }

  // --- Delete Account ---
  openDeleteModal() {
    this.isDeleteModalOpen = true;
    console.log('openDeleteModal called, isDeleteModalOpen:', this.isDeleteModalOpen);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    console.log('closeDeleteModal called, isDeleteModalOpen:', this.isDeleteModalOpen);
  }





  async deleteAccount() {
    this.isDeleting = true;
    try {
      // Idealmente, pediríamos a senha atual aqui também para segurança máxima
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

  restartTutorial() {
    this.tutorialService.start();
    this.router.navigate(['/']); // Go to dashboard to see the tutorial relative to main elements
  }
}
