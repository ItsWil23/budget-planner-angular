import { Category, Subcategory } from '../models/category';

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Revenus', type: 'income', color: '#4CAF50' },
  { id: 'cat-2', name: 'Charges fixes', type: 'expense', color: '#F44336' },
  { id: 'cat-3', name: 'Charges variables', type: 'expense', color: '#FF9800' },
  { id: 'cat-4', name: 'Epargne', type: 'expense', color: '#2196F3' },
];

export const MOCK_SUBCATEGORIES: Subcategory[] = [
  // Revenus (1 sous-catégorie)
  { id: 'sub-1', label: 'Salaire', categoryId: 'cat-1', icon: 'salary' },

  // Charges fixes (3 sous-catégories)
  { id: 'sub-2', label: 'Loyer', categoryId: 'cat-2', icon: 'home' },
  { id: 'sub-3', label: 'Internet', categoryId: 'cat-2', icon: 'wifi' },
  { id: 'sub-4', label: 'Électricité', categoryId: 'cat-2', icon: 'zap' },

  // Charges variables (2 sous-catégories)
  { id: 'sub-5', label: 'Courses', categoryId: 'cat-3', icon: 'shopping-cart' },
  { id: 'sub-6', label: 'Carburant', categoryId: 'cat-3', icon: 'fuel' },

  // Epargne (0 sous-catégorie - pour tester le cas vide)
];
