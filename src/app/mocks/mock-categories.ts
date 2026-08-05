import { Category, Subcategory } from '../models/category';

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Revenus', type: 'income' },
  { id: 'cat-2', name: 'Charges fixes', type: 'expense' },
  { id: 'cat-3', name: 'Charges variables', type: 'expense' },
  { id: 'cat-4', name: 'Epargne', type: 'expense' },
];

export const MOCK_SUBCATEGORIES: Subcategory[] = [
  // Revenus (1 sous-catégorie)
  { id: 'sub-1', label: 'Salaire', categoryId: 'cat-1' },

  // Charges fixes (3 sous-catégories)
  { id: 'sub-2', label: 'Loyer', categoryId: 'cat-2' },
  { id: 'sub-3', label: 'Internet', categoryId: 'cat-2' },
  { id: 'sub-4', label: 'Électricité', categoryId: 'cat-2' },

  // Charges variables (2 sous-catégories)
  { id: 'sub-5', label: 'Courses', categoryId: 'cat-3' },
  { id: 'sub-6', label: 'Carburant', categoryId: 'cat-3' },

  // Epargne (0 sous-catégorie - pour tester le cas vide)
];
