import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface TutorialStep {
  targetId?: string; // ID do elemento alvo (opcional, se for centralizado)
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'; // Preferência de posição
  route?: string; // Rota para navegar antes de mostrar o passo
}

@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  private router = inject(Router);
  isActive = signal(false);
  currentStepIndex = signal(0);

  steps: TutorialStep[] = [
    {
      title: 'Bem-vindo ao monClip!',
      content: 'Vamos fazer um tour rápido para você conhecer as principais funcionalidades.',
      position: 'center',
      route: '/'
    },
    {
      targetId: 'nav-clip',
      title: 'Acesse seu Clip',
      content: 'Clique aqui para acessar o seu Clip, uma área de transferência inteligente entre dispositivos.',
      position: 'bottom',
      route: '/'
    },
    {
      targetId: 'clip-area',
      title: 'Sincronização Rápida',
      content: 'Este é o seu Clip. Tudo que você colar aqui será sincronizado instantaneamente entre seus dispositivos. Lembre-se: o conteúdo dura apenas 1 hora para garantir sua privacidade e agilidade.',
      position: 'bottom',
      route: '/clip'
    },
    {
      targetId: 'nav-notebooks',
      title: 'Seus Cadernos',
      content: 'Aqui você organiza suas informações de forma permanente.',
      position: 'bottom',
      route: '/'
    },
    {
      targetId: 'btn-create-notebook',
      title: 'Crie e Organize',
      content: 'Use este botão para criar novos cadernos. Dentro deles, você pode criar notas, editá-las com formatação rica e até favoritar os mais importantes para acesso rápido.',
      position: 'right',
      route: '/notebooks'
    },
    {
        targetId: 'nav-user-menu', // We need to add this ID to the user menu or use a generic area if not specific. Actually, user requested "Settings". Let's assume header has a link or we guide to settings.
        // Assuming there isn't a direct "Settings" link visible always, usually it's in a user dropdown.
        // Let's Guide to the user menu first if needed, OR just go to the settings page directly.
        // The request said "leve para as configurações". So we route to /settings.
        title: 'Configurações',
        content: 'Aqui você personaliza sua experiência. Escolha temas, ajuste fontes e gerencie sua conta.',
        position: 'center',
        route: '/settings'
    },
    {
        title: 'Dashboard e Filtros',
        content: 'De volta ao início. Aqui você vê suas notas recentes e pode filtrar rapidamente por caderno.',
        targetId: 'recent-notes-filter',
        position: 'bottom',
        route: '/'
    },
    {
      title: 'Precisa de Ajuda?',
      content: 'Se encontrar erros ou tiver sugestões, use este formulário para nos contatar. Estamos sempre melhorando!',
      targetId: 'footer-contact',
      position: 'top',
      route: '/'
    }
  ];

  currentStep = computed(() => this.steps[this.currentStepIndex()]);
  isFirstStep = computed(() => this.currentStepIndex() === 0);
  isLastStep = computed(() => this.currentStepIndex() === this.steps.length - 1);

  private autoAdvanceTimeout: any;
  readonly STEP_DURATION = 10000; // 10 seconds per step

  constructor() { }

  start() {
    this.currentStepIndex.set(0);
    this.isActive.set(true);
    this.navigateToStep(0);
  }

  stop() {
    this.isActive.set(false);
    this.clearAutoAdvance();
  }

  next() {
    this.clearAutoAdvance(); // Clear timer on manual interaction
    if (!this.isLastStep()) {
      const nextIndex = this.currentStepIndex() + 1;
      this.currentStepIndex.set(nextIndex);
      this.navigateToStep(nextIndex);
    } else {
      this.stop();
    }
  }

  previous() {
    this.clearAutoAdvance(); // Clear timer on manual interaction
    if (!this.isFirstStep()) {
      const prevIndex = this.currentStepIndex() - 1;
      this.currentStepIndex.set(prevIndex);
      this.navigateToStep(prevIndex);
    }
  }

  private navigateToStep(index: number) {
      const step = this.steps[index];
      const navigationPromise = step.route ? this.router.navigate([step.route]) : Promise.resolve(true);

      navigationPromise.then(() => {
          if (step.route) {
             window.scrollTo({ top: 0, behavior: 'instant' });
          }
          // Schedule auto-advance after navigation completes
          this.scheduleAutoAdvance();
      });
  }

  private scheduleAutoAdvance() {
    this.clearAutoAdvance();
    if (this.isActive() && !this.isLastStep()) {
        this.autoAdvanceTimeout = setTimeout(() => {
            this.next();
        }, this.STEP_DURATION);
    } else if (this.isLastStep()) {
         // Auto-close on last step too? Or just existing behavior?
         // Usually better to let user close manualy on last step or wait more.
         // Let's auto-close for now to be fully "automatic".
         this.autoAdvanceTimeout = setTimeout(() => {
            this.stop();
         }, this.STEP_DURATION);
    }
  }

  private clearAutoAdvance() {
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
      this.autoAdvanceTimeout = null;
    }
  }
}

