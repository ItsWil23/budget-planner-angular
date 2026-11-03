import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringRule } from '../models/recurring-rule';
import { BudgetService } from './budget';
import { CategoryService } from './category';
import { MoneyService } from './money';
import { RecurringRuleService } from './recurring-rule';

describe('Budget Service', () => {
  let service: BudgetService;
  let recurringRuleService: RecurringRuleService;

  beforeEach(() => {
    recurringRuleService = new RecurringRuleService();
    service = new BudgetService(new MoneyService(), new CategoryService(), recurringRuleService);
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

  describe('openMonth', () => {
    const buildRule = (overrides: Partial<RecurringRule>): RecurringRule => ({
      id: 'rule-test',
      label: 'Règle de test',
      categoryId: 'cat-2',
      subcategoryId: 'sub-2',
      amountCents: 85000,
      startMonth: '2026-07',
      active: true,
      ...overrides,
    });

    it('crée une ligne par règle active du mois de juillet, avec sourceRuleId', () => {
      const result = service.openMonth('2026-07');

      expect(result).toEqual({ monthKey: '2026-07', created: 3, skipped: 0, ignoredRuleIds: [] });
      expect(service.lines()).toEqual([
        expect.objectContaining({ subcategoryId: 'sub-1', plannedAmountCents: 245000, sourceRuleId: 'rule-1' }),
        expect.objectContaining({ subcategoryId: 'sub-2', plannedAmountCents: 85000, sourceRuleId: 'rule-2' }),
        expect.objectContaining({ subcategoryId: 'sub-3', plannedAmountCents: 3999, sourceRuleId: 'rule-3' }),
      ]);
    });

    it('n’applique pas la règle inactive ni la règle terminée en octobre', () => {
      const result = service.openMonth('2026-10');

      expect(result).toEqual({ monthKey: '2026-10', created: 2, skipped: 0, ignoredRuleIds: [] });
      expect(service.lines().map(line => line.sourceRuleId)).toEqual(['rule-1', 'rule-2']);
    });

    it('retient la première règle valide par sous-catégorie et ignore les suivantes', () => {
      const ruleA = buildRule({ id: 'rule-a', amountCents: 85000 });
      const ruleB = buildRule({ id: 'rule-b', amountCents: 1000 });
      vi.spyOn(recurringRuleService, 'activeRulesForMonth').mockReturnValue([ruleA, ruleB]);

      const result = service.openMonth('2026-07');

      expect(result).toEqual({ monthKey: '2026-07', created: 1, skipped: 0, ignoredRuleIds: ['rule-b'] });
      expect(service.lines()).toEqual([
        expect.objectContaining({ subcategoryId: 'sub-2', plannedAmountCents: 85000, sourceRuleId: 'rule-a' }),
      ]);
    });

    it.each([0, -1, 85000.5])(
      'ignore une règle à montant invalide (%s) sans créer de ligne',
      amountCents => {
        const rule = buildRule({ id: 'rule-invalid', amountCents });
        vi.spyOn(recurringRuleService, 'activeRulesForMonth').mockReturnValue([rule]);

        const result = service.openMonth('2026-07');

        expect(result).toEqual({
          monthKey: '2026-07',
          created: 0,
          skipped: 0,
          ignoredRuleIds: ['rule-invalid'],
        });
        expect(service.lines()).toEqual([]);
      },
    );

    it('est idempotent : une seconde ouverture ne change rien et garde les mêmes id', () => {
      service.openMonth('2026-07');
      const firstIds = service.lines().map(line => line.id);

      const second = service.openMonth('2026-07');

      expect(second).toEqual({ monthKey: '2026-07', created: 0, skipped: 0, ignoredRuleIds: [] });
      expect(service.lines().map(line => line.id)).toEqual(firstIds);
      expect(service.months()).toHaveLength(1);
    });

    it('n’écrase pas une ligne saisie avant ouverture et la compte comme ignorée', () => {
      service.setPlannedAmount('2026-07', 'sub-2', 900);

      const result = service.openMonth('2026-07');

      expect(result).toEqual({ monthKey: '2026-07', created: 2, skipped: 1, ignoredRuleIds: [] });
      expect(service.plannedCentsFor('2026-07', 'sub-2')).toBe(90000);
      expect(service.lines().find(line => line.subcategoryId === 'sub-2')?.sourceRuleId).toBeUndefined();
    });

    it('ne recrée pas une ligne mise à 0 par l’utilisateur après ouverture', () => {
      service.openMonth('2026-07');
      service.setPlannedAmount('2026-07', 'sub-2', 0);

      const result = service.openMonth('2026-07');

      expect(result.created).toBe(0);
      expect(service.plannedCentsFor('2026-07', 'sub-2')).toBe(0);
    });

    it('ignore et signale une règle dont la sous-catégorie est inconnue', () => {
      const rule = buildRule({ id: 'rule-99', subcategoryId: 'sub-99' });
      vi.spyOn(recurringRuleService, 'activeRulesForMonth').mockReturnValue([rule]);

      const result = service.openMonth('2026-07');

      expect(result).toEqual({ monthKey: '2026-07', created: 0, skipped: 0, ignoredRuleIds: ['rule-99'] });
      expect(service.lines()).toEqual([]);
    });

    it('ignore et signale une règle dont le categoryId ne correspond pas à la sous-catégorie', () => {
      const rule = buildRule({ id: 'rule-mismatch', categoryId: 'cat-1', subcategoryId: 'sub-2' });
      vi.spyOn(recurringRuleService, 'activeRulesForMonth').mockReturnValue([rule]);

      const result = service.openMonth('2026-07');

      expect(result).toEqual({ monthKey: '2026-07', created: 0, skipped: 0, ignoredRuleIds: ['rule-mismatch'] });
      expect(service.lines()).toEqual([]);
    });

    it('refuse un mois invalide', () => {
      expect(() => service.openMonth('2026-13')).toThrow('Invalid month key format');
    });

    it('indique si un mois est ouvert', () => {
      expect(service.isMonthOpened('2026-07')).toBe(false);

      service.openMonth('2026-07');

      expect(service.isMonthOpened('2026-07')).toBe(true);
    });
  });
});
