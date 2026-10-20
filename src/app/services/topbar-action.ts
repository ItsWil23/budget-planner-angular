import { Injectable, TemplateRef, signal } from '@angular/core';

/**
 * Permet à une page d'afficher son bouton d'action dans la topbar quand l'espace le permet.
 * La page enregistre son TemplateRef, la topbar le lit ; une seule source de markup.
 */
@Injectable({ providedIn: 'root' })
export class TopbarActionService {
  private readonly actionTemplate = signal<TemplateRef<unknown> | null>(null);

  readonly action = this.actionTemplate.asReadonly();

  register(template: TemplateRef<unknown>): void {
    this.actionTemplate.set(template);
  }

  unregister(template: TemplateRef<unknown>): void {
    if (this.actionTemplate() === template) {
      this.actionTemplate.set(null);
    }
  }
}
