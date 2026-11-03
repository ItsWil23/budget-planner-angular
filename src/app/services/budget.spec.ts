import { beforeEach, describe, expect, it } from 'vitest';
import { BudgetService } from './budget';
import { CategoryService } from './category';
import { MoneyService } from './money';

describe('Budget Service', () => {
  let service: BudgetService;

  beforeEach(() => {
    service = new BudgetService(new MoneyService(), new CategoryService());
  });

  it('démarre avec un état vide', () => {
    expect(service.lines()).toEqual([]);
  });

  it('crée une ligne prévue pour une sous-catégorie', () => {
    const line = service.setPlannedAmount('2026-10', 'sub-2', 850);

    expect(service.lines()).toHaveLength(1);
    expect(line).toEqual(
      expect.objectContaining({
        monthKey: '2026-10',
        categoryId: 'cat-2',
        subcategoryId: 'sub-2',
        plannedAmountCents: 85000,
      }),
    );
    expect(service.lines()[0]).toEqual(line);
  });

  it('convertit les euros en centimes', () => {
    service.setPlannedAmount('2026-10', 'sub-3', 12.34);

    expect(service.plannedCentsFor('2026-10', 'sub-3')).toBe(1234);
  });

  it('garantit une seule ligne par (mois, sous-catégorie) et garde la dernière valeur', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 850);
    const updated = service.setPlannedAmount('2026-10', 'sub-2', 900);

    expect(service.lines()).toHaveLength(1);
    expect(service.plannedCentsFor('2026-10', 'sub-2')).toBe(90000);
    expect(updated?.plannedAmountCents).toBe(90000);
  });

  it('conserve l’identifiant de la ligne lors d’une mise à jour', () => {
    const first = service.setPlannedAmount('2026-10', 'sub-2', 850);
    const second = service.setPlannedAmount('2026-10', 'sub-2', 900);

    expect(second?.id).toBe(first?.id);
  });

  it('crée deux lignes distinctes pour la même sous-catégorie sur deux mois', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 850);
    service.setPlannedAmount('2026-11', 'sub-2', 850);

    expect(service.lines()).toHaveLength(2);
    expect(service.plannedCentsFor('2026-10', 'sub-2')).toBe(85000);
    expect(service.plannedCentsFor('2026-11', 'sub-2')).toBe(85000);
  });

  it('retire la ligne existante quand le montant vaut 0 et renvoie null', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 850);

    const result = service.setPlannedAmount('2026-10', 'sub-2', 0);

    expect(result).toBeNull();
    expect(service.lines()).toHaveLength(0);
    expect(service.plannedCentsFor('2026-10', 'sub-2')).toBe(0);
  });

  it('ne lève pas d’erreur quand on met à 0 une ligne absente', () => {
    expect(service.setPlannedAmount('2026-10', 'sub-2', 0)).toBeNull();
    expect(service.lines()).toEqual([]);
  });

  it('refuse un montant négatif', () => {
    expect(() => service.setPlannedAmount('2026-10', 'sub-2', -1)).toThrow('Invalid amount');
  });

  it('refuse un montant négatif inférieur au centime sans supprimer la ligne existante', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 850);

    expect(() => service.setPlannedAmount('2026-10', 'sub-2', -0.001)).toThrow('Invalid amount');
    expect(service.lines()).toHaveLength(1);
    expect(service.plannedCentsFor('2026-10', 'sub-2')).toBe(85000);
  });

  it('refuse NaN', () => {
    expect(() => service.setPlannedAmount('2026-10', 'sub-2', NaN)).toThrow('Invalid amount');
  });

  it('refuse Infinity', () => {
    expect(() => service.setPlannedAmount('2026-10', 'sub-2', Infinity)).toThrow('Invalid amount');
  });

  it('refuse une sous-catégorie inconnue', () => {
    expect(() => service.setPlannedAmount('2026-10', 'sub-99', 100)).toThrow('Unknown subcategory');
  });

  it('refuse un mois invalide', () => {
    expect(() => service.setPlannedAmount('2026-13', 'sub-2', 100)).toThrow('Invalid month key format');
  });

  it('linesForMonth ne renvoie que les lignes du mois demandé', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 850);
    service.setPlannedAmount('2026-10', 'sub-3', 30);
    service.setPlannedAmount('2026-11', 'sub-2', 850);

    const october = service.linesForMonth('2026-10');

    expect(october).toHaveLength(2);
    expect(october.every(line => line.monthKey === '2026-10')).toBe(true);
  });

  it('modifier le tableau renvoyé par linesForMonth ne modifie pas lines()', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 850);

    const october = service.linesForMonth('2026-10');
    october.splice(0);

    expect(october).toHaveLength(0);
    expect(service.lines()).toHaveLength(1);
  });
});
