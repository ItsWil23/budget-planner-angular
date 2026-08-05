import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { Category, Subcategory } from '../../../models/category';

@Component({
  selector: 'app-category-card',
  imports: [],
  templateUrl: './category-card.html',
  styleUrl: './category-card.scss',
})
export class CategoryCard {
  @Input() category!: Category;
  @Input() subcategories: Subcategory[] = [];

  @Output() editCategory = new EventEmitter<{ id: string; name: string; type: string }>();
  @Output() deleteCategory = new EventEmitter<string>();
  @Output() addSubcategory = new EventEmitter<{ categoryId: string; label: string }>();
  @Output() editSubcategory = new EventEmitter<{ id: string; label: string }>();
  @Output() deleteSubcategory = new EventEmitter<string>();

  protected readonly isEditingCategory = signal(false);
  protected readonly editingSubcategoryId = signal<string | null>(null);
  protected readonly newSubcategoryLabel = signal('');
  protected readonly editValues = signal({ name: '', type: '' });

  protected startEditingCategory() {
    this.editValues.set({ name: this.category.name, type: this.category.type });
    this.isEditingCategory.set(true);
  }

  protected saveCategory() {
    const values = this.editValues();
    this.editCategory.emit({
      id: this.category.id,
      name: values.name,
      type: values.type,
    });
    this.isEditingCategory.set(false);
  }

  protected cancelEditCategory() {
    this.isEditingCategory.set(false);
  }

  protected onDeleteCategory() {
    this.deleteCategory.emit(this.category.id);
  }

  protected onAddSubcategory() {
    this.addSubcategory.emit({
      categoryId: this.category.id,
      label: this.newSubcategoryLabel(),
    });
    this.newSubcategoryLabel.set('');
  }

  protected startEditingSubcategory(id: string) {
    this.editingSubcategoryId.set(id);
  }

  protected saveSubcategory(id: string, newLabel: string) {
    this.editSubcategory.emit({
      id: id,
      label: newLabel,
    });
    this.editingSubcategoryId.set(null);
  }

  protected onDeleteSubcategory(id: string) {
    this.deleteSubcategory.emit(id);
  }
}
