import { describe, it, expect } from 'vitest';
import type { Category, Subcategory } from '../models/category';
import { CategoryService } from './category';

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(() => {
    service = new CategoryService();
  });

  describe('Initial state', () => {
    it('should expose categories signal with initial mock data', () => {
      const categories = service.categories();
      expect(categories).toBeDefined();
      expect(categories.length).toBe(4); // Revenus, Charges fixes, Charges variables, Epargne
      expect(categories[0].id).toBe('cat-1');
      expect(categories[0].name).toBe('Revenus');
    });

    it('should expose subcategories signal with initial mock data', () => {
      const subcategories = service.subcategories();
      expect(subcategories).toBeDefined();
      expect(subcategories.length).toBe(6); // 1 salaire + 3 charges fixes + 2 charges variables
      expect(subcategories[0].id).toBe('sub-1');
      expect(subcategories[0].categoryId).toBe('cat-1');
    });
  });

  describe('Category mutations', () => {
    it('should update a category name and type', () => {
      const initialName = service.categories()[0].name;
      service.updateCategory('cat-1', { name: 'Revenus corrigé', type: 'income' });
      expect(service.categories()[0].name).toBe('Revenus corrigé');
    });

    it('should delete a category and its subcategories', () => {
      const initialCategoriesCount = service.categories().length;
      const initialSubcategoriesCount = service.subcategories().length;

      service.deleteCategory('cat-2');

      expect(service.categories().length).toBe(initialCategoriesCount - 1);
      expect(
        service.subcategories().some(sub => sub.categoryId === 'cat-2')
      ).toBe(false);
    });

    it('should add a new category', () => {
      const newCategory: Category = {
        id: 'cat-99',
        name: 'Test Category',
        type: 'expense',
        color: '#000000',
      };
      service.addCategory(newCategory);
      expect(service.categories().length).toBe(5);
      expect(service.categories()[4].id).toBe('cat-99');
    });
  });

  describe('Subcategory mutations', () => {
    it('should add a new subcategory', () => {
      const newSubcategory: Subcategory = {
        id: 'sub-99',
        name: 'Test Subcategory',
        categoryId: 'cat-1',
        icon: '',
      };
      service.addSubcategory(newSubcategory);
      expect(service.subcategories().length).toBe(7);
    });

    it('should update a subcategory name', () => {
      service.updateSubcategory('sub-1', { name: 'Salaire modifié' });
      expect(service.subcategories()[0].name).toBe('Salaire modifié');
    });

    it('should delete a subcategory', () => {
      const initialCount = service.subcategories().length;
      service.deleteSubcategory('sub-1');
      expect(service.subcategories().length).toBe(initialCount - 1);
    });
  });
});
