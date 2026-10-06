import { Injectable, signal } from '@angular/core';
import { Category, Subcategory } from '../models/category';
import { MOCK_CATEGORIES, MOCK_SUBCATEGORIES } from '../mocks/mock-categories';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  // === ÉTAT INITIAL (signaux en lecture seule exposés) ===
  private readonly _categories = signal<Category[]>(MOCK_CATEGORIES);
  private readonly _subcategories = signal<Subcategory[]>(MOCK_SUBCATEGORIES);

  readonly categories = this._categories.asReadonly();
  readonly subcategories = this._subcategories.asReadonly();

  // Méthodes de mutation pour les catégories
  updateCategory(id: string, payload: { name: string; type: Category['type'] }): void {
    this._categories.update(cats =>
      cats.map(cat =>
        cat.id === id ? { ...cat, name: payload.name, type: payload.type } : cat
      )
    );
  }

  deleteCategory(id: string): void {
    // Supprimer la catégorie et toutes ses sous-catégories
    this._categories.update(cats => cats.filter(cat => cat.id !== id));
    this._subcategories.update(subs => subs.filter(sub => sub.categoryId !== id));
  }

  addCategory(category: Category): void {
    this._categories.update(cats => [...cats, category]);
  }

  // Méthodes de mutation pour les sous-catégories
  addSubcategory(subcategory: Subcategory): void {
    this._subcategories.update(subs => [...subs, subcategory]);
  }

  updateSubcategory(id: string, payload: { name: string; icon?: string }): void {
    this._subcategories.update(subs =>
      subs.map(sub =>
        sub.id === id ? { ...sub, ...payload } : sub
      )
    );
  }

  deleteSubcategory(id: string): void {
    this._subcategories.update(subs => subs.filter(sub => sub.id !== id));
  }

  // Méthode pour filtrer les sous-catégories par catégorie
  getSubcategoriesForCategory(categoryId: string): Subcategory[] {
    return this._subcategories().filter(sub => sub.categoryId === categoryId);
  }
}
