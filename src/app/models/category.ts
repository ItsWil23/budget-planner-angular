export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
}

export interface Subcategory {
  id: string;
  label: string;
  categoryId: string; // FK vers Category.id
  icon: string;
}
