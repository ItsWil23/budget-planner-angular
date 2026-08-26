import { Component, signal } from '@angular/core';
import { Category, Subcategory } from '../../models/category';
import { MOCK_CATEGORIES, MOCK_SUBCATEGORIES } from '../../mocks/mock-categories';
import { CategoryCard } from '../../components/ui/category-card/category-card';

@Component({
  selector: 'app-categories',
  imports: [CategoryCard],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories {
  // === ÉTAT GLOBAL (signals) ===
  protected readonly categories = signal<Category[]>(MOCK_CATEGORIES);
  protected readonly subcategories = signal<Subcategory[]>(MOCK_SUBCATEGORIES);

  // === GESTION DES CATÉGORIES ===

  protected onEditCategory(payload: { id: string; name: string; type: string }) {
    this.categories.update(cats =>
      cats.map(cat =>
        cat.id === payload.id
          ? { ...cat, name: payload.name, type: payload.type as 'income' | 'expense' }
          : cat
      )
    );
  }

  protected onDeleteCategory(id: string) {
    // Supprimer la catégorie
    this.categories.update(cats => cats.filter(cat => cat.id !== id));
    // Supprimer toutes les sous-catégories associées
    this.subcategories.update(subs => subs.filter(sub => sub.categoryId !== id));
  }

  // === GESTION DES SOUS-CATÉGORIES ===

  protected onAddSubcategory(payload: { categoryId: string; label: string }) {
    if (!payload.label.trim()) return;

    const newSubcategory: Subcategory = {
      id: `sub-${Date.now()}`, // ID temporaire pour la phase A
      name: payload.label.trim(),
      categoryId: payload.categoryId,
      icon: '',
    };

    this.subcategories.update(subs => [...subs, newSubcategory]);
  }

  protected onEditSubcategory(payload: { id: string; label: string }) {
    if (!payload.label.trim()) return;

    this.subcategories.update(subs =>
      subs.map(sub =>
        sub.id === payload.id ? { ...sub, name: payload.label.trim() } : sub
      )
    );
  }

  protected onDeleteSubcategory(id: string) {
    this.subcategories.update(subs => subs.filter(sub => sub.id !== id));
  }

  // === UTILITAIRE ===

  protected getSubcategoriesForCategory(categoryId: string): Subcategory[] {
    return this.subcategories().filter(sub => sub.categoryId === categoryId);
  }
}
