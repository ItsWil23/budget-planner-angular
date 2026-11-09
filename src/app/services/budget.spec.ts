import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetMonth } from '../models/budget-month';
import { RecurringRule } from '../models/recurring-rule';
import { BudgetCategorySummary, BudgetMonthSummary, BudgetSubcategorySummary } from '../models/budget-summary';
import { BudgetService, PlannedAggregateOverflowError } from './budget';
import { CategoryService } from './category';
import { MoneyService } from './money';
import { MonthContextService } from './month-context';
import { RecurringRuleService } from './recurring-rule';
import { TransactionService } from './transaction';

describe('Budget Service', () => {
  let service: BudgetService;
  let categoryService: CategoryService;
  let recurringRuleService: RecurringRuleService;
  let transactionService: TransactionService;
  let monthContext: MonthContextService;

  beforeEach(() => {
    categoryService = new CategoryService();
    recurringRuleService = new RecurringRuleService();
    transactionService = new TransactionService(new MoneyService());
    monthContext = new MonthContextService();
    service = new BudgetService(
      categoryService,
      recurringRuleService,
      transactionService,
      monthContext,
    );
  });

  it('démarre avec un état vide', () => {
    expect(service.lines()).toEqual([]);
  });

  it('crée une ligne prévue pour une sous-catégorie', () => {
    const line = service.setPlannedAmount('2026-10', 'sub-2', 85000);

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

  it('enregistre les centimes saisis tels quels', () => {
    service.setPlannedAmount('2026-10', 'sub-3', 1234);

    expect(service.plannedCentsFor('2026-10', 'sub-3')).toBe(1234);
  });

  it('garantit une seule ligne par (mois, sous-catégorie) et garde la dernière valeur', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 85000);
    const updated = service.setPlannedAmount('2026-10', 'sub-2', 90000);

    expect(service.lines()).toHaveLength(1);
    expect(service.plannedCentsFor('2026-10', 'sub-2')).toBe(90000);
    expect(updated?.plannedAmountCents).toBe(90000);
  });

  it('conserve l’identifiant de la ligne lors d’une mise à jour', () => {
    const first = service.setPlannedAmount('2026-10', 'sub-2', 85000);
    const second = service.setPlannedAmount('2026-10', 'sub-2', 90000);

    expect(second?.id).toBe(first?.id);
  });

  it('crée deux lignes distinctes pour la même sous-catégorie sur deux mois', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 85000);
    service.setPlannedAmount('2026-11', 'sub-2', 85000);

    expect(service.lines()).toHaveLength(2);
    expect(service.plannedCentsFor('2026-10', 'sub-2')).toBe(85000);
    expect(service.plannedCentsFor('2026-11', 'sub-2')).toBe(85000);
  });

  it('retire la ligne existante quand le montant vaut 0 et renvoie null', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 85000);

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

  it('refuse un montant non entier sans supprimer la ligne existante', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 85000);

    expect(() => service.setPlannedAmount('2026-10', 'sub-2', 85000.5)).toThrow('Invalid amount');
    expect(() => service.setPlannedAmount('2026-10', 'sub-2', -0.5)).toThrow('Invalid amount');
    expect(service.lines()).toHaveLength(1);
    expect(service.plannedCentsFor('2026-10', 'sub-2')).toBe(85000);
  });

  it('refuse des euros passés à la place de centimes : 12.34 n’est pas un montant en centimes', () => {
    expect(() => service.setPlannedAmount('2026-10', 'sub-3', 12.34)).toThrow('Invalid amount');
    expect(service.lines()).toEqual([]);
  });

  it('accepte le plus grand montant sûr en centimes', () => {
    service.setPlannedAmount('2026-10', 'sub-2', Number.MAX_SAFE_INTEGER);

    expect(service.plannedCentsFor('2026-10', 'sub-2')).toBe(Number.MAX_SAFE_INTEGER);
  });

  describe('garde-fou d’agrégat prévu', () => {
    it('refuse un centime de plus dans une autre sous-catégorie de la même catégorie, sans mutation', () => {
      service.setPlannedAmount('2026-10', 'sub-2', Number.MAX_SAFE_INTEGER);
      const before = service.lines();

      expect(() => service.setPlannedAmount('2026-10', 'sub-3', 1)).toThrow(
        PlannedAggregateOverflowError,
      );
      expect(service.lines()).toBe(before);
      expect(service.plannedCentsFor('2026-10', 'sub-3')).toBe(0);
    });

    it('refuse la mise à jour d’une ligne existante qui ferait dépasser le total de sa catégorie', () => {
      service.setPlannedAmount('2026-10', 'sub-2', 100);
      service.setPlannedAmount('2026-10', 'sub-3', Number.MAX_SAFE_INTEGER - 100);
      const before = service.lines();

      expect(() => service.setPlannedAmount('2026-10', 'sub-2', 101)).toThrow(
        PlannedAggregateOverflowError,
      );
      expect(service.lines()).toBe(before);
      expect(service.plannedCentsFor('2026-10', 'sub-2')).toBe(100);
    });

    it('refuse le dépassement du total mensuel des dépenses, les lignes restant individuellement sûres', () => {
      service.setPlannedAmount('2026-10', 'sub-2', Number.MAX_SAFE_INTEGER - 10);
      const before = service.lines();

      // sub-5 appartient à cat-3 (dépense) : chaque ligne est sûre, leur somme mensuelle ne l'est pas.
      expect(() => service.setPlannedAmount('2026-10', 'sub-5', 11)).toThrow(
        PlannedAggregateOverflowError,
      );
      expect(service.lines()).toBe(before);
      expect(service.plannedCentsFor('2026-10', 'sub-5')).toBe(0);
    });

    it('refuse le dépassement du total mensuel des revenus, les lignes restant individuellement sûres', () => {
      categoryService.addCategory({ id: 'cat-income-2', name: 'Autres revenus', type: 'income', color: '#2e7d32' });
      categoryService.addSubcategory({
        id: 'sub-income-2',
        name: 'Prime',
        categoryId: 'cat-income-2',
        icon: 'gift',
      });
      service.setPlannedAmount('2026-10', 'sub-1', Number.MAX_SAFE_INTEGER - 10);
      const before = service.lines();

      expect(() => service.setPlannedAmount('2026-10', 'sub-income-2', 11)).toThrow(
        PlannedAggregateOverflowError,
      );
      expect(service.lines()).toBe(before);
      expect(service.plannedCentsFor('2026-10', 'sub-income-2')).toBe(0);
    });

    it('ne compte pas les lignes des autres mois dans le total mensuel', () => {
      service.setPlannedAmount('2026-10', 'sub-2', Number.MAX_SAFE_INTEGER);

      expect(service.setPlannedAmount('2026-11', 'sub-5', Number.MAX_SAFE_INTEGER)).toEqual(
        expect.objectContaining({ monthKey: '2026-11', plannedAmountCents: Number.MAX_SAFE_INTEGER }),
      );
    });

    it('accepte une mise à jour qui remplace la ligne sans la compter deux fois', () => {
      service.setPlannedAmount('2026-10', 'sub-2', Number.MAX_SAFE_INTEGER - 10);

      service.setPlannedAmount('2026-10', 'sub-2', Number.MAX_SAFE_INTEGER);

      expect(service.plannedCentsFor('2026-10', 'sub-2')).toBe(Number.MAX_SAFE_INTEGER);
      expect(service.lines()).toHaveLength(1);
    });

    it('libère de la place en mettant une ligne à 0 puis accepte une nouvelle ligne', () => {
      service.setPlannedAmount('2026-10', 'sub-2', Number.MAX_SAFE_INTEGER);
      service.setPlannedAmount('2026-10', 'sub-2', 0);

      service.setPlannedAmount('2026-10', 'sub-3', Number.MAX_SAFE_INTEGER);

      expect(service.plannedCentsFor('2026-10', 'sub-3')).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  it('refuse un montant au-delà des entiers sûrs sans mutation', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 85000);

    expect(() => service.setPlannedAmount('2026-10', 'sub-2', Number.MAX_SAFE_INTEGER + 1)).toThrow(
      'Invalid amount',
    );
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
    service.setPlannedAmount('2026-10', 'sub-2', 85000);
    service.setPlannedAmount('2026-10', 'sub-3', 3000);
    service.setPlannedAmount('2026-11', 'sub-2', 85000);

    const october = service.linesForMonth('2026-10');

    expect(october).toHaveLength(2);
    expect(october.every(line => line.monthKey === '2026-10')).toBe(true);
  });

  it('modifier le tableau renvoyé par linesForMonth ne modifie pas lines()', () => {
    service.setPlannedAmount('2026-10', 'sub-2', 85000);

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
      service.setPlannedAmount('2026-07', 'sub-2', 90000);

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

    describe('garde-fou d’agrégat à l’ouverture', () => {
      it('refuse des règles individuellement sûres qui dépassent ensemble la catégorie, sans rien créer', () => {
        vi.spyOn(recurringRuleService, 'activeRulesForMonth').mockReturnValue([
          buildRule({ id: 'rule-big', subcategoryId: 'sub-2', amountCents: Number.MAX_SAFE_INTEGER - 100 }),
          buildRule({ id: 'rule-over', subcategoryId: 'sub-3', amountCents: 200 }),
        ]);
        const before = service.lines();

        expect(() => service.openMonth('2026-07')).toThrow(PlannedAggregateOverflowError);
        expect(service.lines()).toBe(before);
        expect(service.isMonthOpened('2026-07')).toBe(false);
        expect(service.months().some(month => month.initialized)).toBe(false);
      });

      it('refuse un dépassement du total mensuel des dépenses porté par deux catégories sûres, sans mutation', () => {
        vi.spyOn(recurringRuleService, 'activeRulesForMonth').mockReturnValue([
          buildRule({ id: 'rule-big', subcategoryId: 'sub-2', amountCents: Number.MAX_SAFE_INTEGER - 100 }),
          buildRule({ id: 'rule-other', subcategoryId: 'sub-5', categoryId: 'cat-3', amountCents: 200 }),
        ]);
        const before = service.lines();

        expect(() => service.openMonth('2026-07')).toThrow(PlannedAggregateOverflowError);
        expect(service.lines()).toBe(before);
        expect(service.plannedCentsFor('2026-07', 'sub-5')).toBe(0);
        expect(service.isMonthOpened('2026-07')).toBe(false);
      });

      it('ne crée aucune ligne valide quand une seule candidate dépasse avec une ligne existante', () => {
        service.setPlannedAmount('2026-07', 'sub-3', Number.MAX_SAFE_INTEGER - 100);
        const before = service.lines();
        vi.spyOn(recurringRuleService, 'activeRulesForMonth').mockReturnValue([
          buildRule({ id: 'rule-ok', subcategoryId: 'sub-5', categoryId: 'cat-3', amountCents: 1000 }),
          buildRule({ id: 'rule-over', subcategoryId: 'sub-2', amountCents: 200 }),
        ]);

        expect(() => service.openMonth('2026-07')).toThrow(PlannedAggregateOverflowError);
        expect(service.lines()).toBe(before);
        expect(service.plannedCentsFor('2026-07', 'sub-5')).toBe(0);
        expect(service.plannedCentsFor('2026-07', 'sub-2')).toBe(0);
        expect(service.isMonthOpened('2026-07')).toBe(false);
      });

      it('accepte exactement Number.MAX_SAFE_INTEGER au total mensuel des dépenses', () => {
        vi.spyOn(recurringRuleService, 'activeRulesForMonth').mockReturnValue([
          buildRule({ id: 'rule-big', subcategoryId: 'sub-2', amountCents: Number.MAX_SAFE_INTEGER - 100 }),
          buildRule({ id: 'rule-edge', subcategoryId: 'sub-5', categoryId: 'cat-3', amountCents: 100 }),
        ]);

        const result = service.openMonth('2026-07');

        expect(result.created).toBe(2);
        expect(service.isMonthOpened('2026-07')).toBe(true);
        expect(service.plannedCentsFor('2026-07', 'sub-5')).toBe(100);
      });

      it('ignore une règle au montant non sûr comme une règle invalide, sans bloquer les autres', () => {
        vi.spyOn(recurringRuleService, 'activeRulesForMonth').mockReturnValue([
          buildRule({ id: 'rule-unsafe', subcategoryId: 'sub-2', amountCents: 2 ** 53 }),
          buildRule({ id: 'rule-ok', subcategoryId: 'sub-5', categoryId: 'cat-3', amountCents: 1000 }),
        ]);

        const result = service.openMonth('2026-07');

        expect(result).toEqual({
          monthKey: '2026-07',
          created: 1,
          skipped: 0,
          ignoredRuleIds: ['rule-unsafe'],
        });
        expect(service.plannedCentsFor('2026-07', 'sub-5')).toBe(1000);
      });

      it('permet d’ouvrir le mois après correction des règles qui avaient été refusées', () => {
        const spy = vi.spyOn(recurringRuleService, 'activeRulesForMonth').mockReturnValue([
          buildRule({ id: 'rule-big', subcategoryId: 'sub-2', amountCents: Number.MAX_SAFE_INTEGER - 100 }),
          buildRule({ id: 'rule-over', subcategoryId: 'sub-5', categoryId: 'cat-3', amountCents: 200 }),
        ]);
        expect(() => service.openMonth('2026-07')).toThrow(PlannedAggregateOverflowError);

        spy.mockReturnValue([
          buildRule({ id: 'rule-big', subcategoryId: 'sub-2', amountCents: 85000 }),
          buildRule({ id: 'rule-over', subcategoryId: 'sub-5', categoryId: 'cat-3', amountCents: 200 }),
        ]);
        const result = service.openMonth('2026-07');

        expect(result.created).toBe(2);
        expect(service.isMonthOpened('2026-07')).toBe(true);
      });
    });

    it('indique si un mois est ouvert', () => {
      expect(service.isMonthOpened('2026-07')).toBe(false);

      service.openMonth('2026-07');

      expect(service.isMonthOpened('2026-07')).toBe(true);
    });
  });

  describe('monthSummary', () => {
    type SummaryAmountKey = 'plannedAmountCents' | 'actualAmountCents' | 'varianceCents';

    const findCategory = (summary: BudgetMonthSummary, categoryId: string): BudgetCategorySummary => {
      const category = summary.categories.find(item => item.categoryId === categoryId);
      if (!category) {
        throw new Error(`Missing category ${categoryId}`);
      }
      return category;
    };

    const findSubcategory = (
      summary: BudgetMonthSummary,
      subcategoryId: string,
    ): BudgetSubcategorySummary => {
      const subcategory = summary.categories
        .flatMap(category => category.subcategories)
        .find(item => item.subcategoryId === subcategoryId);
      if (!subcategory) {
        throw new Error(`Missing subcategory ${subcategoryId}`);
      }
      return subcategory;
    };

    const sumOf = (items: BudgetSubcategorySummary[], key: SummaryAmountKey): number =>
      items.reduce((total, item) => total + item[key], 0);

    beforeEach(() => {
      monthContext.setMonth('2026-07');
    });

    it('calcule les réels de juillet depuis les transactions des mocks', () => {
      const summary = service.monthSummary();

      expect(summary.monthKey).toBe('2026-07');
      expect(findSubcategory(summary, 'sub-1')).toEqual(
        expect.objectContaining({
          categoryId: 'cat-1',
          categoryType: 'income',
          plannedAmountCents: 0,
          actualAmountCents: 245000,
          varianceCents: 245000,
        }),
      );
      expect(findSubcategory(summary, 'sub-2').actualAmountCents).toBe(85000);
      expect(findCategory(summary, 'cat-1').actualAmountCents).toBe(245000);
      expect(findCategory(summary, 'cat-2').actualAmountCents).toBe(85000);
      expect(findCategory(summary, 'cat-3').actualAmountCents).toBe(0);
    });

    it('garde toutes les catégories dans l’ordre du CategoryService, y compris cat-4 vide', () => {
      const summary = service.monthSummary();

      expect(summary.categories.map(category => category.categoryId)).toEqual(
        categoryService.categories().map(category => category.id),
      );
      expect(findCategory(summary, 'cat-4')).toEqual({
        categoryId: 'cat-4',
        categoryType: 'expense',
        plannedAmountCents: 0,
        actualAmountCents: 0,
        varianceCents: 0,
        consumptionRate: undefined,
        status: undefined,
        subcategories: [],
      });
    });

    it('donne un réel à 0, un écart négatif, un taux 0 et le statut under à un prévu sans transaction', () => {
      service.setPlannedAmount('2026-07', 'sub-5', 10000);
      const summary = service.monthSummary();

      expect(findSubcategory(summary, 'sub-5')).toEqual(
        expect.objectContaining({
          plannedAmountCents: 10000,
          actualAmountCents: 0,
          varianceCents: -10000,
          consumptionRate: 0,
          status: 'under',
        }),
      );
      expect(findCategory(summary, 'cat-3')).toEqual(
        expect.objectContaining({
          plannedAmountCents: 10000,
          actualAmountCents: 0,
          varianceCents: -10000,
          consumptionRate: 0,
          status: 'under',
        }),
      );
    });

    it('garde une sous-catégorie avec réel sans prévu, taux et statut indéfinis', () => {
      monthContext.setMonth('2026-08');
      const summary = service.monthSummary();

      expect(findSubcategory(summary, 'sub-3')).toEqual(
        expect.objectContaining({
          plannedAmountCents: 0,
          actualAmountCents: 3999,
          varianceCents: 3999,
          consumptionRate: undefined,
          status: undefined,
        }),
      );
    });

    it('agrège le réel d’une catégorie dont le prévu total vaut 0, taux et statut indéfinis', () => {
      monthContext.setMonth('2026-08');
      const category = findCategory(service.monthSummary(), 'cat-2');

      expect(category).toEqual(
        expect.objectContaining({
          plannedAmountCents: 0,
          actualAmountCents: 11239,
          varianceCents: 11239,
          consumptionRate: undefined,
          status: undefined,
        }),
      );
    });

    it('calcule le ratio et le statut d’un revenu : salaire de juillet 245000 pour prévu 200000 est over', () => {
      service.setPlannedAmount('2026-07', 'sub-1', 200000);
      const summary = service.monthSummary();
      const expected = {
        plannedAmountCents: 200000,
        actualAmountCents: 245000,
        varianceCents: 45000,
        consumptionRate: 1.225,
        status: 'over',
      };

      expect(findSubcategory(summary, 'sub-1')).toEqual(
        expect.objectContaining({ categoryType: 'income', ...expected }),
      );
      expect(findCategory(summary, 'cat-1')).toEqual(expect.objectContaining(expected));
    });

    it.each([
      { subcategoryId: 'sub-2', plannedCents: 106250, expected: 'under' },
      { subcategoryId: 'sub-2', plannedCents: 100000, expected: 'on-track' },
      { subcategoryId: 'sub-2', plannedCents: 85000, expected: 'on-track' },
      { subcategoryId: 'sub-2', plannedCents: 70000, expected: 'over' },
      { subcategoryId: 'sub-1', plannedCents: 400000, expected: 'under' },
      { subcategoryId: 'sub-1', plannedCents: 306250, expected: 'under' },
      { subcategoryId: 'sub-1', plannedCents: 300000, expected: 'on-track' },
      { subcategoryId: 'sub-1', plannedCents: 200000, expected: 'over' },
    ])(
      'applique les seuils de statut à $subcategoryId prévu $plannedCents centimes → $expected',
      ({ subcategoryId, plannedCents, expected }) => {
        service.setPlannedAmount('2026-07', subcategoryId, plannedCents);

        expect(findSubcategory(service.monthSummary(), subcategoryId).status).toBe(expected);
      },
    );

    it('agrège une catégorie comme la somme de ses sous-catégories', () => {
      monthContext.setMonth('2026-08');
      service.setPlannedAmount('2026-08', 'sub-3', 5000);
      service.setPlannedAmount('2026-08', 'sub-4', 10000);
      const category = findCategory(service.monthSummary(), 'cat-2');
      const subcategories = category.subcategories;

      expect(subcategories.map(subcategory => subcategory.subcategoryId)).toEqual([
        'sub-2',
        'sub-3',
        'sub-4',
      ]);
      expect(category).toEqual(
        expect.objectContaining({
          plannedAmountCents: 15000,
          actualAmountCents: 11239,
          varianceCents: -3761,
          status: 'under',
        }),
      );
      expect(sumOf(subcategories, 'plannedAmountCents')).toBe(category.plannedAmountCents);
      expect(sumOf(subcategories, 'actualAmountCents')).toBe(category.actualAmountCents);
      expect(sumOf(subcategories, 'varianceCents')).toBe(category.varianceCents);
    });

    it('calcule le bandeau d’allocation : revenus prévus, dépenses prévues et non alloué', () => {
      service.setPlannedAmount('2026-07', 'sub-1', 200000);
      service.setPlannedAmount('2026-07', 'sub-2', 100000);
      service.setPlannedAmount('2026-07', 'sub-5', 30000);
      const summary = service.monthSummary();

      expect(summary.incomePlannedCents).toBe(200000);
      expect(summary.expensePlannedCents).toBe(130000);
      expect(summary.unallocatedCents).toBe(70000);
    });

    it('autorise un montant non alloué négatif dans le bandeau', () => {
      service.setPlannedAmount('2026-07', 'sub-1', 100000);
      service.setPlannedAmount('2026-07', 'sub-2', 150000);
      const summary = service.monthSummary();

      expect(summary.incomePlannedCents).toBe(100000);
      expect(summary.expensePlannedCents).toBe(150000);
      expect(summary.unallocatedCents).toBe(-50000);
    });

    it('se met à jour quand MonthContextService change le mois', () => {
      expect(service.monthSummary().monthKey).toBe('2026-07');

      monthContext.setMonth('2026-08');

      expect(service.monthSummary().monthKey).toBe('2026-08');
      expect(findCategory(service.monthSummary(), 'cat-2').actualAmountCents).toBe(11239);
    });

    it('se met à jour quand les transactions ou les lignes prévues changent', () => {
      expect(findSubcategory(service.monthSummary(), 'sub-2').actualAmountCents).toBe(85000);

      transactionService.add({
        label: 'Loyer supplémentaire',
        categoryId: 'cat-2',
        subcategoryId: 'sub-2',
        date: '2026-07-15',
        type: 'expense',
        amountEuros: 10,
      });
      expect(findSubcategory(service.monthSummary(), 'sub-2').actualAmountCents).toBe(86000);

      service.setPlannedAmount('2026-07', 'sub-2', 100000);
      expect(findSubcategory(service.monthSummary(), 'sub-2')).toEqual(
        expect.objectContaining({ plannedAmountCents: 100000, status: 'on-track' }),
      );

      transactionService.add({
        label: 'Loyer d’août',
        categoryId: 'cat-2',
        subcategoryId: 'sub-2',
        date: '2026-08-10',
        type: 'expense',
        amountEuros: 5,
      });
      expect(findSubcategory(service.monthSummary(), 'sub-2').actualAmountCents).toBe(86000);
    });
  });

  describe('solde d’ouverture et report', () => {
    const monthOf = (monthKey: string): BudgetMonth | undefined =>
      service.months().find(month => month.monthKey === monthKey);

    it('ouvre juillet sans juin initialisé à 0 et calcule sa clôture réelle', () => {
      service.openMonth('2026-07');

      expect(monthOf('2026-07')).toEqual(
        expect.objectContaining({
          openingBalanceCents: 0,
          openingBalanceOverridden: false,
          initialized: true,
        }),
      );
      expect(service.actualClosingBalanceCentsFor('2026-07')).toBe(160000);
    });

    it('reporte la clôture réelle de juillet sur l’ouverture d’août', () => {
      service.openMonth('2026-07');
      service.openMonth('2026-08');

      expect(monthOf('2026-08')?.openingBalanceCents).toBe(160000);
      expect(service.openingBalanceCentsFor('2026-08')).toBe(160000);
    });

    it('ne change pas la clôture réelle quand seul le prévu change', () => {
      service.openMonth('2026-07');
      service.openMonth('2026-08');

      service.setPlannedAmount('2026-07', 'sub-2', 200000);

      expect(service.actualClosingBalanceCentsFor('2026-07')).toBe(160000);
      expect(monthOf('2026-08')?.openingBalanceCents).toBe(160000);
    });

    it('recalcule la clôture de juillet et l’ouverture d’août après une nouvelle transaction', () => {
      service.openMonth('2026-07');
      service.openMonth('2026-08');

      transactionService.add({
        label: 'Achat imprévu',
        categoryId: 'cat-2',
        subcategoryId: 'sub-2',
        date: '2026-07-15',
        type: 'expense',
        amountEuros: 100,
      });

      expect(service.actualClosingBalanceCentsFor('2026-07')).toBe(150000);
      expect(monthOf('2026-08')?.openingBalanceCents).toBe(150000);
    });

    it('conserve un ajustement manuel négatif et recalcule la clôture réelle du mois ajusté', () => {
      service.openMonth('2026-07');
      service.openMonth('2026-08');

      const adjusted = service.setOpeningBalanceOverride('2026-08', -5000);

      expect(adjusted).toEqual(
        expect.objectContaining({
          openingBalanceCents: -5000,
          openingBalanceOverridden: true,
        }),
      );
      expect(monthOf('2026-08')?.openingBalanceCents).toBe(-5000);
      expect(service.actualClosingBalanceCentsFor('2026-08')).toBe(15761);
    });

    it('fait suivre septembre et les mois suivants depuis la clôture d’août, sans toucher à l’ajustement d’août', () => {
      service.openMonth('2026-07');
      service.openMonth('2026-08');
      service.openMonth('2026-09');
      service.openMonth('2026-10');
      service.setOpeningBalanceOverride('2026-08', -5000);

      expect(monthOf('2026-09')?.openingBalanceCents).toBe(15761);
      expect(monthOf('2026-10')?.openingBalanceCents).toBe(251131);

      transactionService.add({
        label: 'Dépense de juillet',
        categoryId: 'cat-2',
        subcategoryId: 'sub-2',
        date: '2026-07-20',
        type: 'expense',
        amountEuros: 10,
      });

      expect(service.actualClosingBalanceCentsFor('2026-07')).toBe(159000);
      expect(monthOf('2026-08')?.openingBalanceCents).toBe(-5000);
      expect(monthOf('2026-09')?.openingBalanceCents).toBe(15761);
      expect(monthOf('2026-10')?.openingBalanceCents).toBe(251131);
    });

    it('garde deux ajustements fixes et reprend le report après chacun', () => {
      service.openMonth('2026-07');
      service.openMonth('2026-08');
      service.openMonth('2026-09');
      service.openMonth('2026-10');
      service.openMonth('2026-11');
      service.setOpeningBalanceOverride('2026-08', -5000);
      service.setOpeningBalanceOverride('2026-10', 100000);

      transactionService.add({
        label: 'Dépense de juillet',
        categoryId: 'cat-2',
        subcategoryId: 'sub-2',
        date: '2026-07-20',
        type: 'expense',
        amountEuros: 10,
      });

      expect(monthOf('2026-08')?.openingBalanceCents).toBe(-5000);
      expect(monthOf('2026-09')?.openingBalanceCents).toBe(15761);
      expect(monthOf('2026-10')?.openingBalanceCents).toBe(100000);
      expect(monthOf('2026-11')?.openingBalanceCents).toBe(338150);
    });

    it('efface un ajustement et remet le report automatique sur les mois suivants', () => {
      service.openMonth('2026-07');
      service.openMonth('2026-08');
      service.openMonth('2026-09');
      service.setOpeningBalanceOverride('2026-08', -5000);

      const cleared = service.clearOpeningBalanceOverride('2026-08');

      expect(cleared).toEqual(
        expect.objectContaining({ openingBalanceCents: 160000, openingBalanceOverridden: false }),
      );
      expect(monthOf('2026-09')?.openingBalanceCents).toBe(180761);
    });

    it('refuse d’ajuster ou d’effacer un mois non initialisé', () => {
      expect(() => service.setOpeningBalanceOverride('2026-08', 0)).toThrow(
        'Budget month not initialized',
      );
      expect(() => service.clearOpeningBalanceOverride('2026-08')).toThrow(
        'Budget month not initialized',
      );
      expect(service.months()).toEqual([]);
    });

    it('refuse une ouverture non entière sans modifier l’état', () => {
      service.openMonth('2026-07');
      const before = service.months();

      expect(() => service.setOpeningBalanceOverride('2026-07', 1.5)).toThrow(
        'Invalid opening balance',
      );
      expect(service.months()).toEqual(before);
    });

    it('ouvre septembre à 0 sans août, puis recalcule la chaîne à l’ouverture d’août', () => {
      service.openMonth('2026-07');
      service.openMonth('2026-09');

      expect(monthOf('2026-09')?.openingBalanceCents).toBe(0);

      service.openMonth('2026-08');

      expect(monthOf('2026-08')?.openingBalanceCents).toBe(160000);
      expect(monthOf('2026-09')?.openingBalanceCents).toBe(180761);
    });

    it('lit le report d’un mois non initialisé sans l’initialiser', () => {
      service.openMonth('2026-07');
      const monthsBefore = service.months();

      expect(service.openingBalanceCentsFor('2026-08')).toBe(160000);
      expect(service.actualClosingBalanceCentsFor('2026-08')).toBe(
        service.openingBalanceCentsFor('2026-08') + 32000 - (3999 + 7240),
      );
      expect(service.actualClosingBalanceCentsFor('2026-08')).toBe(180761);
      expect(service.isMonthOpened('2026-08')).toBe(false);
      expect(service.months()).toEqual(monthsBefore);
      expect(service.months()).toHaveLength(1);
    });

    it('expose dans monthSummary les soldes d’ouverture et de clôture réelle, réactifs', () => {
      service.openMonth('2026-07');
      monthContext.setMonth('2026-07');

      expect(service.monthSummary()).toEqual(
        expect.objectContaining({ openingBalanceCents: 0, actualClosingBalanceCents: 160000 }),
      );

      monthContext.setMonth('2026-08');
      expect(service.monthSummary()).toEqual(
        expect.objectContaining({ openingBalanceCents: 160000, actualClosingBalanceCents: 180761 }),
      );

      service.openMonth('2026-08');
      service.setOpeningBalanceOverride('2026-08', -5000);
      expect(service.monthSummary()).toEqual(
        expect.objectContaining({ openingBalanceCents: -5000, actualClosingBalanceCents: 15761 }),
      );

      transactionService.add({
        label: 'Dépense d’août',
        categoryId: 'cat-2',
        subcategoryId: 'sub-2',
        date: '2026-08-20',
        type: 'expense',
        amountEuros: 10,
      });
      expect(service.monthSummary().actualClosingBalanceCents).toBe(
        service.actualClosingBalanceCentsFor('2026-08'),
      );
      expect(service.monthSummary().actualClosingBalanceCents).toBe(14761);
    });
  });
});
