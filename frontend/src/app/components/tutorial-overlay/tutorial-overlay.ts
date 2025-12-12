import { Component, inject, effect, signal, HostListener, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TutorialService } from '../../services/tutorial.service';
import { LucideAngularModule } from 'lucide-angular';
import { computePosition, flip, shift, offset, arrow, autoUpdate, Placement } from '@floating-ui/dom';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-tutorial-overlay',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './tutorial-overlay.html',
  styleUrls: ['./tutorial-overlay.css']
})
export class TutorialOverlayComponent implements OnDestroy {
  tutorialService = inject(TutorialService);
  private dataService = inject(DataService);

  arrowStyle = { top: '', left: '', bottom: '', right: '' };
  isCenterPosition = signal(false);

  private cleanupAutoUpdate?: () => void;

  constructor() {
    effect(() => {
      const step = this.tutorialService.currentStep();
      const isActive = this.tutorialService.isActive();

      if (this.cleanupAutoUpdate) {
        this.cleanupAutoUpdate();
        this.cleanupAutoUpdate = undefined;
      }

      if (isActive) {
        // Wait a bit for navigation and DOM render
        setTimeout(() => {
            this.startFloating();
        }, 300);
      }
    });
  }

  ngOnDestroy() {
    if (this.cleanupAutoUpdate) {
      this.cleanupAutoUpdate();
    }
  }

  // Modified to use autoUpdate
  async startFloating() {
    const step = this.tutorialService.currentStep();
    const tooltip = document.getElementById('tutorial-popover');
    const arrowElement = document.getElementById('tutorial-arrow');

    if (!tooltip || !arrowElement) return;

    if (step.position === 'center' || !step.targetId) {
      this.isCenterPosition.set(true);
      return;
    }

    const target = document.getElementById(step.targetId);

    if (!target) {
        console.warn(`Tutorial target #${step.targetId} not found`);
        this.isCenterPosition.set(true);
        return;
    }

    // Scroll target into view if needed (smoothly)
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    this.isCenterPosition.set(false);

    // We already handled 'center' above, and step.position type includes 'center'.
    // However, Floating UI 'Placement' does NOT include 'center'.
    // We cast to Placement to satisfy TS, knowing we filtered out 'center'.
    const placementBase = (step.position as any) === 'center' ? 'bottom' : (step.position as Placement || 'bottom');

    this.cleanupAutoUpdate = autoUpdate(target, tooltip, () => {
        computePosition(target, tooltip, {
            placement: placementBase,
            middleware: [
                offset(16), // Increased offset
                flip({ crossAxis: true, padding: 20 }), // Enable flipping to top/bottom if right/left lacks space
                shift({ padding: 20 }), // Ensure 20px padding from screen edges
                arrow({ element: arrowElement })
            ],
        }).then(({ x, y, placement, middlewareData }) => {
            Object.assign(tooltip.style, {
                left: `${x}px`,
                top: `${y}px`,
            });

            const { x: arrowX, y: arrowY } = middlewareData.arrow || {};
            const staticSide = {
                top: 'bottom',
                right: 'left',
                bottom: 'top',
                left: 'right',
            }[placement.split('-')[0]] as string;

            Object.assign(arrowElement.style, {
                left: arrowX != null ? `${arrowX}px` : '',
                top: arrowY != null ? `${arrowY}px` : '',
                right: '',
                bottom: '',
                [staticSide]: '-4px',
            });
        });
    });
  }

  handleNext() {
    if (this.tutorialService.isLastStep()) {
      this.tutorialService.stop();
      this.dataService.completeTutorial();
    } else {
      this.tutorialService.next();
    }
  }
}
