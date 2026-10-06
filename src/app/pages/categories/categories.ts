import { Component, inject } from '@angular/core';
import { CategoryService } from '../../services/category';
import { Subcategory } from '../../models/category';
import { CategoryCard } from '../../components/ui/category-card/category-card';

@Component({
  selector: 'app-categories',
  imports: [CategoryCard],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories {
  protected readonly categoryService = inject(CategoryService);
  protected readonly categories = this.categoryService.categories;

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
