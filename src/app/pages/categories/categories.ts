import {
  Component,
  DestroyRef,
  TemplateRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { CategoryService } from '../../services/category';
import { TopbarActionService } from '../../services/topbar-action';
import { Subcategory } from '../../models/category';
import { CategoryCard } from '../../components/ui/category-card/category-card';

@Component({
  selector: 'app-categories',
  imports: [CategoryCard, NgTemplateOutlet, TranslocoPipe],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories {
  protected readonly categoryService = inject(CategoryService);
  protected readonly categories = this.categoryService.categories;

  private readonly topbarAction = inject(TopbarActionService);
  protected readonly addButton = viewChild.required<TemplateRef<unknown>>('addButton');
  private registeredAddButton: TemplateRef<unknown> | null = null;

  constructor() {
    // Le bouton est partagé avec la topbar (affichée seulement entre 500px et 767px) : il est enregistré après le rendu.
    afterNextRender(() => {
      this.registeredAddButton = this.addButton();
      this.topbarAction.register(this.registeredAddButton);
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.registeredAddButton) {
        this.topbarAction.unregister(this.registeredAddButton);
      }
    });
  }

  // === GESTION DES CATÉGORIES ===

  protected onEditCategory(payload: { id: string; name: string; type: string }) {
    this.categoryService.updateCategory(payload.id, {
      name: payload.name,
      type: payload.type as 'income' | 'expense',
    });
  }

  protected onDeleteCategory(id: string) {
    this.categoryService.deleteCategory(id);
  }

  // === GESTION DES SOUS-CATÉGORIES ===

  protected onAddSubcategory(payload: { categoryId: string; label: string }) {
    if (!payload.label.trim()) return;

    const newId = `sub-${Date.now()}`; // ID temporaire pour la phase A
    this.categoryService.addSubcategory({
      id: newId,
      name: payload.label.trim(),
      categoryId: payload.categoryId,
      icon: '',
    });
  }

  protected onEditSubcategory(payload: { id: string; label: string }) {
    if (!payload.label.trim()) return;

    this.categoryService.updateSubcategory(payload.id, {
      name: payload.label.trim(),
    });
  }

  protected onDeleteSubcategory(id: string) {
    this.categoryService.deleteSubcategory(id);
  }

  // === UTILITAIRE ===

  protected getSubcategoriesForCategory(categoryId: string): Subcategory[] {
    return this.categoryService.getSubcategoriesForCategory(categoryId);
  }
}
