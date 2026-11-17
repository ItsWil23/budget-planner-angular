import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { MoneyPipe } from '../../components/ui/money-pipe/money-pipe';
import { CategoryType } from '../../models/category';
import { RecurringRule } from '../../models/recurring-rule';
import { BudgetService } from '../../services/budget';
import { CategoryService } from '../../services/category';
import { MoneyService } from '../../services/money';
import { MonthContextService } from '../../services/month-context';
import { RecurringRuleService } from '../../services/recurring-rule';
import { SettingsService } from '../../services/settings';
import { TransactionService } from '../../services/transaction';
import { BudgetMensuel, buildCategoryColumns, maxColumnsFor, planCategoryColumns, sizeGroupOf, type ColumnSpec } from './budget-mensuel';

const TEST_MONTH = '2026-07';
const MINUS_SIGN = '\u2212';

const FR_TRANSLATIONS = {
  budgetMensuel: {
    allocation: {
      income: 'Revenus prévus',
      expense: 'Dépenses prévues',
      unallocated: 'Montant non alloué',
    },
    budgetedClosingBalance: { label: 'Clôture budgétée', unavailable: 'Indisponible' },
    table: {
      label: 'Suivi par catégorie',
      columns: { subcategory: 'Sous-catégories', planned: 'Prévu', actual: 'Réel' },
      noSubcategory: 'À compléter : aucune sous-catégorie configurée.',
      plannedUnset: 'Non renseigné',
      editPlanned: 'Modifier le prévu pour {{ name }} ({{ value }})',
      plannedFieldLabel: 'Prévu pour {{ name }}',
      amountInvalid: 'Montant invalide : saisissez 0 ou un montant d’au moins 0,01 €, avec deux décimales maximum.',
      amountAggregateOverflow: 'Montant refusé : le total prévu de la catégorie ou du mois dépasserait la capacité de calcul exacte de l’application. Saisissez un montant plus petit.',
      clearPlanned: 'Effacer le prévu pour {{ name }}',
      shortcuts: 'Accès rapide aux catégories',
      progress: { label: 'Progression de {{ name }}', value: 'Réel {{ actual }} sur {{ planned }} prévus' },
    },
    preparation: {
      title: 'Préparation du mois',
    },
    recurringRules: {
      trigger: 'Gérer les règles récurrentes',
      title: 'Règles récurrentes',
    },
    equation: {
      title: 'Équation du mois',
      caption: 'Clôture = ouverture + revenus prévus − dépenses prévues',
      opening: "Solde d'ouverture",
      indicative: "Montants indicatifs : le mois n'est pas encore préparé.",
    },
    openingBalance: {
      unprepared: 'Mois non préparé',
      automatic: 'Automatique',
      manual: 'Ajusté manuellement',
      unpreparedHelp: 'Initialiser le mois avec les récurrences actives et le solde d\'ouverture.',
      adjustHelp: 'Ajuster le solde d\'ouverture manuellement ou revenir au calcul automatique',
      prepare: 'Préparer le mois',
      adjust: 'Ajuster',
      reset: 'Revenir au calcul automatique',
      manageRules: 'Récurrences',
      fieldLabel: "Solde d'ouverture ajusté, en euros",
      toggleSign: 'Basculer le signe (positif ou négatif)',
      editHint: 'Entrée enregistre, Échap annule.',
      amountInvalid: 'Montant invalide : saisissez un montant en euros, avec deux décimales maximum (ex. -12,50).',
      amountTooLarge: 'Montant trop grand pour être enregistré : saisissez une valeur plus petite.',
      prepareAggregateOverflow: 'Préparation refusée : les récurrences actives dépassent la capacité de calcul exacte de l’application. Réduisez leurs montants pour préparer le mois.',
    },
  },
};

const EN_TRANSLATIONS = {
  budgetMensuel: {
    allocation: {
      income: 'Planned income',
      expense: 'Planned expenses',
      unallocated: 'Unallocated amount',
    },
    budgetedClosingBalance: { label: 'Budgeted closing balance', unavailable: 'Unavailable' },
    table: {
      label: 'Category tracking',
      columns: { subcategory: 'Subcategories', planned: 'Planned', actual: 'Actual' },
      noSubcategory: 'To complete: no subcategory configured.',
      plannedUnset: 'Not set',
      editPlanned: 'Edit planned amount for {{ name }} ({{ value }})',
      plannedFieldLabel: 'Planned amount for {{ name }}',
      amountInvalid: 'Invalid amount: enter 0 or an amount of at least €0.01, with at most two decimals.',
      amountAggregateOverflow: "Amount rejected: the planned total of the category or the month would exceed the application's exact calculation capacity. Enter a smaller amount.",
      clearPlanned: 'Clear planned amount for {{ name }}',
      shortcuts: 'Quick access to categories',
      progress: { label: 'Progress of {{ name }}', value: 'Actual {{ actual }} of {{ planned }} planned' },
    },
    preparation: {
      title: 'Month preparation',
    },
    recurringRules: {
      trigger: 'Manage recurring rules',
      title: 'Recurring rules',
    },
    equation: {
      title: 'Month equation',
      caption: 'Closing = opening + planned income − planned expenses',
      opening: 'Opening balance',
      indicative: 'Indicative amounts: the month is not prepared yet.',
    },
    openingBalance: {
      unprepared: 'Month not prepared',
      automatic: 'Automatic',
      manual: 'Adjusted manually',
      unpreparedHelp: 'Initialise the month with the active recurring rules and the opening balance',
      adjustHelp: 'Adjust the opening balance manually or return to automatic calculation',
      prepare: 'Prepare month',
      adjust: 'Adjust',
      reset: 'Return to automatic calculation',
      manageRules: 'Recurrences',
      fieldLabel: 'Adjusted opening balance, in euros',
      toggleSign: 'Switch sign (positive or negative)',
      editHint: 'Enter saves, Escape cancels.',
      amountInvalid: 'Invalid amount: enter an amount in euros, with at most two decimals (e.g. -12.50).',
      amountTooLarge: 'Amount too large to be saved: enter a smaller value.',
      prepareAggregateOverflow: "Preparation refused: the active recurring lines exceed the application's exact calculation capacity. Reduce their amounts to prepare the month.",
    },
  },
};

describe('BudgetMensuel', () => {
  let component: BudgetMensuel;
  let fixture: ComponentFixture<BudgetMensuel>;
  let pipe: MoneyPipe;

  function subcategoryIdOf(type: CategoryType): string {
    const categoryService = TestBed.inject(CategoryService);
    const category = categoryService.categories().find(item => item.type === type);
    const subcategory = category
      ? categoryService.getSubcategoriesForCategory(category.id)[0]
      : undefined;
    if (!subcategory) {
      throw new Error(`No subcategory for type ${type}`);
    }
    return subcategory.id;
  }

  function expected(amountCents: number, type?: CategoryType): string {
    return pipe.transform(amountCents, TestBed.inject(SettingsService).settings(), type);
  }

  /** Montants de l'équation, dans l'ordre : ouverture, revenus, dépenses, clôture, non alloué. */
  function equationValues(): string[] {
    const cells: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.equation-value');
    return Array.from(cells, (cell: HTMLElement) => cell.textContent?.trim() ?? '');
  }

  /** Libellés de l'équation, dans le même ordre que `equationValues`. */
  function equationLabels(): string[] {
    const cells: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.equation-label');
    return Array.from(cells, (cell: HTMLElement) => cell.textContent?.trim() ?? '');
  }

  /** Opérateurs de l'équation : case d'ouverture vide, puis +, −, =. */
  function equationOperators(): string[] {
    const cells: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.equation-operator');
    return Array.from(cells, (cell: HTMLElement) => cell.textContent?.trim() ?? '');
  }

  function budgetedClosingCents(): number | null {
    return TestBed.inject(BudgetService).monthSummary().budgetedClosingBalanceCents;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BudgetMensuel,
        TranslocoTestingModule.forRoot({
          langs: { fr: FR_TRANSLATIONS, en: EN_TRANSLATIONS },
          translocoConfig: {
            availableLangs: ['fr', 'en'],
            defaultLang: 'fr',
            reRenderOnLangChange: true,
          },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    TestBed.inject(MonthContextService).setMonth(TEST_MONTH);
    pipe = new MoneyPipe(TestBed.inject(MoneyService));

    fixture = TestBed.createComponent(BudgetMensuel);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the recurring-rule manager from the Budget Mensuel page', () => {
    const trigger: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '.overview-preparation [data-action="manage-recurring-rules"]',
    );

    expect(trigger?.textContent?.trim()).toBe('Récurrences');
    expect(trigger?.closest('.opening')).not.toBeNull();
    expect(fixture.nativeElement.querySelector(':scope > [data-action="open-manager"]')).toBeNull();
    trigger?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.textContent).toContain('Règles récurrentes');
  });

  it('places the recurring-rule action first in the preparation actions', () => {
    const first: HTMLElement | null = fixture.nativeElement.querySelector('.overview-preparation .opening-actions button');

    expect(first?.getAttribute('data-action')).toBe('manage-recurring-rules');
  });

  it('localizes the recurring-rule manager trigger and dialog in English', async () => {
    await TestBed.inject(TranslocoService).setActiveLang('en');
    fixture.detectChanges();
    await fixture.whenStable();

    const trigger: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '.overview-preparation [data-action="manage-recurring-rules"]',
    );
    expect(trigger?.textContent?.trim()).toBe('Recurrences');
    trigger?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.textContent).toContain('Recurring rules');
  });

  it('renders the preparation rail and the equation as sibling islands without nesting', () => {
    const overview: HTMLElement | null = fixture.nativeElement.querySelector('.overview');
    const rail: HTMLElement | null = overview?.querySelector('.overview-preparation') ?? null;
    const equationHost: HTMLElement | null = overview?.querySelector('.overview-equation') ?? null;
    const equation: HTMLElement | null = equationHost?.querySelector('.equation') ?? null;

    expect(overview?.children.length).toBe(2);
    expect(rail?.parentElement).toBe(overview);
    expect(equationHost?.parentElement).toBe(overview);
    expect(equation?.parentElement).toBe(equationHost);
    expect(equation?.querySelectorAll('.equation, .opening, .overview-preparation')).toHaveLength(0);
    expect(equation?.querySelectorAll('button, input, select, textarea')).toHaveLength(0);
  });

  it('labels the equation island with its visible heading', () => {
    const equation: HTMLElement | null = fixture.nativeElement.querySelector('.equation');
    const heading: HTMLElement | null = fixture.nativeElement.querySelector('#budget-equation-title');

    expect(equation?.getAttribute('aria-labelledby')).toBe('budget-equation-title');
    expect(heading?.tagName).toBe('H2');
    expect(heading?.textContent?.trim()).toBe('Équation du mois');
  });

  it('labels the secondary amount with the unallocated value without repeating the indicative heading', () => {
    const secondary: HTMLElement | null = fixture.nativeElement.querySelector('.equation-secondary');

    expect(secondary?.getAttribute('aria-label')).toBe('Montant non alloué');
    expect(secondary?.querySelector('h3')).toBeNull();
    expect(secondary?.querySelector('.equation-note')).toBeNull();
    expect(fixture.nativeElement.querySelector('.equation > .equation-note')?.textContent).toContain(
      "Montants indicatifs : le mois n'est pas encore préparé.",
    );
  });

  it('does not open the month automatically', () => {
    expect(TestBed.inject(BudgetService).isMonthOpened(TEST_MONTH)).toBe(false);
  });

  describe('without planned lines', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('renders zero income and expenses without sign', () => {
      const values = equationValues();
      expect(values).toEqual([expected(0), expected(0), expected(0), expected(0), expected(0)]);
      expect(values.some(value => value.includes(MINUS_SIGN))).toBe(false);
      expect(values.some(value => value.startsWith('+'))).toBe(false);
    });
  });

  describe('with planned lines', () => {
    beforeEach(() => {
      const budget = TestBed.inject(BudgetService);
      budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('income'), 300000);
      budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 100000);
      fixture.detectChanges();
    });

    it('renders income, expenses, unallocated and closing amounts through MoneyPipe', () => {
      expect(equationValues()).toEqual([
        expected(0),
        expected(300000),
        expected(100000),
        expected(200000),
        expected(200000),
      ]);
    });

    it('shows the plus and minus operators in the formula', () => {
      expect(equationOperators()).toEqual(['', '+', MINUS_SIGN, '=']);
    });

    it('shows no sign on a positive unallocated amount', () => {
      const unallocated = equationValues()[4];
      expect(unallocated.startsWith('+')).toBe(false);
      expect(unallocated.startsWith(MINUS_SIGN)).toBe(false);
    });

    it('keeps the operators fixed when planned expenses are reset to zero', () => {
      TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 0);
      fixture.detectChanges();

      expect(equationValues()).toEqual([
        expected(0),
        expected(300000),
        expected(0),
        expected(300000),
        expected(300000),
      ]);
      expect(equationOperators()).toEqual(['', '+', MINUS_SIGN, '=']);
    });

    it('keeps the minus sign and the real value on a negative unallocated amount', () => {
      TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 500000);
      fixture.detectChanges();

      const unallocated = equationValues()[4];
      expect(unallocated.startsWith(MINUS_SIGN)).toBe(true);
      expect(unallocated).toBe(expected(-200000));
    });

    it('reflects a change of currency and locale from SettingsService', () => {
      TestBed.inject(SettingsService).updateSettings({ currency: 'USD', locale: 'en-US' });
      fixture.detectChanges();

      const values = equationValues();
      expect(values).toEqual([
        expected(0),
        expected(300000),
        expected(100000),
        expected(200000),
        expected(200000),
      ]);
    });
  });

  describe('translations', () => {
    it('renders the French labels by default', () => {
      expect(equationLabels()).toEqual([
        "Solde d'ouverture",
        'Revenus prévus',
        'Dépenses prévues',
        'Clôture budgétée',
        'Montant non alloué',
      ]);
    });

    it('renders the English labels after switching language', () => {
      TestBed.inject(TranslocoService).setActiveLang('en');
      fixture.detectChanges();

      expect(equationLabels()).toEqual([
        'Opening balance',
        'Planned income',
        'Planned expenses',
        'Budgeted closing balance',
        'Unallocated amount',
      ]);
    });
  });

  describe('budgeted closing balance', () => {
    function setPlanned(incomeCents: number, expenseCents: number): void {
      const budget = TestBed.inject(BudgetService);
      budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('income'), incomeCents);
      budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), expenseCents);
      fixture.detectChanges();
    }

    function setUnavailable(): void {
      const budget = TestBed.inject(BudgetService);
      const categoryService = TestBed.inject(CategoryService);
      budget.openMonth(TEST_MONTH);
      categoryService
        .subcategories()
        .forEach(subcategory => budget.setPlannedAmount(TEST_MONTH, subcategory.id, 0));
      budget.setOpeningBalanceOverride(TEST_MONTH, -Number.MAX_SAFE_INTEGER);
      budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 1);
      fixture.detectChanges();
    }

    it('renders a zero closing balance without sign', () => {
      setPlanned(100000, 100000);

      const closing = equationValues()[3];
      expect(budgetedClosingCents()).toBe(0);
      expect(closing).toBe(expected(0));
      expect(closing.startsWith('+')).toBe(false);
      expect(closing.startsWith(MINUS_SIGN)).toBe(false);
    });

    it('renders a negative closing balance with the minus sign', () => {
      setPlanned(100000, 500000);

      const closing = equationValues()[3];
      expect(budgetedClosingCents()).toBe(-400000);
      expect(closing).toBe(expected(-400000));
      expect(closing.startsWith(MINUS_SIGN)).toBe(true);
    });

    it('follows the displayed month when it changes', () => {
      setPlanned(300000, 100000);
      expect(equationValues()[3]).toBe(expected(200000));

      TestBed.inject(MonthContextService).setMonth('2026-08');
      fixture.detectChanges();

      const budget = TestBed.inject(BudgetService);
      expect(equationValues()[3]).toBe(expected(budget.openingBalanceCentsFor('2026-08')));
      expect(equationValues()[3]).not.toBe(expected(200000));
    });

    it('shows the localized unavailable state instead of a rounded value', () => {
      setUnavailable();

      const closing: HTMLElement | null = fixture.nativeElement.querySelector(
        '.equation-result .equation-value',
      );
      expect(budgetedClosingCents()).toBeNull();
      expect(closing?.textContent?.trim()).toBe('Indisponible');
      expect(closing?.classList.contains('equation-value-unavailable')).toBe(true);
    });

    it('shows the English unavailable state after switching language', () => {
      TestBed.inject(TranslocoService).setActiveLang('en');
      setUnavailable();

      const closing: HTMLElement | null = fixture.nativeElement.querySelector(
        '.equation-result .equation-value',
      );
      expect(closing?.textContent?.trim()).toBe('Unavailable');
    });
  });


  describe('table layout', () => {
    const restores: (() => void)[] = [];

    function stubProperty(target: object, key: string, value: unknown): void {
      const original = Object.getOwnPropertyDescriptor(target, key);
      Object.defineProperty(target, key, { value, configurable: true, writable: true });
      restores.push(() => {
        if (original) {
          Object.defineProperty(target, key, original);
        } else {
          Reflect.deleteProperty(target, key);
        }
      });
    }

    function stubMatchMedia(desktop: boolean): void {
      const view = document.defaultView;
      if (!view) {
        throw new Error('No window view available');
      }
      stubProperty(view, 'matchMedia', (query: string) => ({
        matches: desktop,
        media: query,
        addEventListener: (): void => undefined,
        removeEventListener: (): void => undefined,
      }));
    }

    function stubResizeObserver(width: number): void {
      vi.stubGlobal(
        'ResizeObserver',
        class {
          private readonly callback: (entries: { contentRect: { width: number } }[]) => void;

          constructor(callback: (entries: { contentRect: { width: number } }[]) => void) {
            this.callback = callback;
          }

          observe(): void {
            this.callback([{ contentRect: { width } }]);
          }

          unobserve(): void {}

          disconnect(): void {}
        },
      );
    }

    afterEach(() => {
      while (restores.length > 0) {
        restores.pop()?.();
      }
      vi.unstubAllGlobals();
    });

    function renderWith(options: { desktop: boolean; width: number }): void {
      stubMatchMedia(options.desktop);
      stubResizeObserver(options.width);
      fixture.destroy();
      fixture = TestBed.createComponent(BudgetMensuel);
      component = fixture.componentInstance;
      fixture.detectChanges();
    }

    function renderMobile(): void {
      renderWith({ desktop: false, width: 375 });
    }

    function elementsOf<T extends Element>(selector: string): T[] {
      const host: HTMLElement = fixture.nativeElement;
      return Array.from(host.querySelectorAll<T>(selector));
    }

    function elementOf<T extends Element>(selector: string): T | null {
      const host: HTMLElement = fixture.nativeElement;
      return host.querySelector<T>(selector);
    }

    function textsOf(root: ParentNode | null | undefined, selector: string): string[] {
      const nodes: HTMLElement[] = root ? Array.from(root.querySelectorAll<HTMLElement>(selector)) : [];
      return nodes.map(node => node.textContent?.trim() ?? '');
    }

    function categoryIdOf(type: CategoryType): string {
      const category = TestBed.inject(CategoryService).categories().find(item => item.type === type);
      if (!category) {
        throw new Error(`No category for type ${type}`);
      }
      return category.id;
    }

    function subcategoryNameOf(id: string): string {
      return TestBed.inject(CategoryService).subcategories().find(item => item.id === id)?.name ?? '';
    }

    function categoryCount(): number {
      return TestBed.inject(CategoryService).categories().length;
    }

    function cardOf(categoryId: string): HTMLElement | null {
      return elementOf<HTMLElement>(`#budget-category-${categoryId}`);
    }

    function lineOf(name: string): HTMLElement | undefined {
      return elementsOf<HTMLElement>('li.line').find(
        line => line.querySelector('.line-name')?.textContent?.trim() === name,
      );
    }

    describe('column packing', () => {
      type Item = { id: string; rowCount: number };

      function itemsOf(...rows: number[]): Item[] {
        return rows.map((rowCount, index) => ({ id: `item-${index}`, rowCount }));
      }

      function rowsByColumn(columns: ColumnSpec<Item>[]): number[][] {
        return columns.map(column => column.items.map(item => item.rowCount));
      }

      it('maps row counts to size groups at the boundaries', () => {
        expect([0, 5, 6, 10, 11].map(sizeGroupOf)).toEqual(['small', 'small', 'medium', 'medium', 'large']);
      });

      it('packs at most three small categories per column', () => {
        expect(rowsByColumn(buildCategoryColumns(itemsOf(2, 2, 2, 2)))).toEqual([[2, 2, 2], [2]]);
        expect(rowsByColumn(buildCategoryColumns(itemsOf(3, 5)))).toEqual([[3, 5]]);
      });

      it('pairs medium categories when both fit within the 18-row capacity', () => {
        expect(rowsByColumn(buildCategoryColumns(itemsOf(8, 8)))).toEqual([[8, 8]]);
        expect(rowsByColumn(buildCategoryColumns(itemsOf(8, 10)))).toEqual([[8, 10]]);
        expect(rowsByColumn(buildCategoryColumns(itemsOf(6, 6, 6)))).toEqual([[6, 6], [6]]);
      });

      it('splits a medium pair that exceeds the capacity into single columns', () => {
        expect(rowsByColumn(buildCategoryColumns(itemsOf(10, 10)))).toEqual([[10], [10]]);
      });

      it('sorts large categories by ascending row count, one per column', () => {
        expect(rowsByColumn(buildCategoryColumns(itemsOf(12, 11, 20)))).toEqual([[11], [12], [20]]);
      });

      it('keeps the input order for ties among large categories', () => {
        const columns = buildCategoryColumns([
          { id: 'first', rowCount: 12 },
          { id: 'second', rowCount: 12 },
        ]);
        expect(columns.map(column => column.items[0].id)).toEqual(['first', 'second']);
      });

      it('orders groups small, then medium, then large', () => {
        const columns = buildCategoryColumns([
          { id: 'large', rowCount: 12 },
          { id: 'medium', rowCount: 6 },
          { id: 'small', rowCount: 2 },
        ]);
        expect(columns.map(column => column.size)).toEqual(['small', 'medium', 'large']);
      });

      it('never produces an empty column and keeps every category', () => {
        const source = itemsOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19);
        const columns = buildCategoryColumns(source);
        expect(columns.every(column => column.items.length > 0)).toBe(true);
        expect(
          columns.every(
            column => column.rows === column.items.reduce((sum, item) => sum + item.rowCount, 0),
          ),
        ).toBe(true);
        expect(columns.reduce((sum, column) => sum + column.items.length, 0)).toBe(source.length);
      });

      it('keeps the packing invariants across many generated compositions', () => {
        const RANK: Record<string, number> = { small: 0, medium: 1, large: 2 };
        let seed = 7;
        const nextRowCount = (): number => {
          seed = (seed * 16807) % 2147483647;
          return seed % 21;
        };

        for (let round = 0; round < 200; round += 1) {
          const count = 1 + (round % 30);
          const source = Array.from({ length: count }, (_, index) => ({ id: `item-${index}`, rowCount: nextRowCount() }));
          const columns = buildCategoryColumns(source);

          expect(columns.reduce((sum, column) => sum + column.items.length, 0)).toBe(count);
          expect(columns.every(column => column.items.length > 0)).toBe(true);
          expect(columns.map(column => RANK[column.size])).toEqual(
            [...columns.map(column => RANK[column.size])].sort((a, b) => a - b),
          );
          for (const column of columns) {
            expect(new Set(column.items.map(item => sizeGroupOf(item.rowCount))).size).toBe(1);
            if (column.size === 'large') expect(column.items).toHaveLength(1);
            if (column.size === 'small') expect(column.items.length).toBeLessThanOrEqual(3);
            if (column.size === 'medium') expect(column.items.length).toBeLessThanOrEqual(2);
            if (column.items.length > 1) expect(column.rows).toBeLessThanOrEqual(18);
          }
          const large = columns.filter(column => column.size === 'large').map(column => column.rows);
          expect(large).toEqual([...large].sort((a, b) => a - b));
        }
      });

      it('maps the available width to at most five columns', () => {
        expect([655, 656, 992, 9999].map(maxColumnsFor)).toEqual([1, 2, 3, 5]);
      });

      it('merges adjacent columns of the same group down to the maximum column count', () => {
        const plan = planCategoryColumns(itemsOf(1, 1, 1, 1, 6, 6, 6, 6), 3);
        expect(plan.mode).toBe('columns');
        if (plan.mode === 'columns') {
          expect(rowsByColumn(plan.columns)).toEqual([[1, 1, 1, 1], [6, 6], [6, 6]]);
        }
      });

      it('never merges large categories', () => {
        const plan = planCategoryColumns(itemsOf(12, 13, 14), 3);
        expect(plan.mode).toBe('columns');
        if (plan.mode === 'columns') {
          expect(plan.columns.map(column => column.size)).toEqual(['large', 'large', 'large']);
          expect(plan.columns.every(column => column.items.length === 1)).toBe(true);
        }
      });

      it('switches to balanced when the large categories and groups cannot fit the column count', () => {
        expect(planCategoryColumns(itemsOf(12, 13, 14, 15, 16, 17), 5).mode).toBe('balanced');
        expect(planCategoryColumns(itemsOf(1, 12, 13), 2).mode).toBe('balanced');
        expect(planCategoryColumns(itemsOf(1, 1, 12), 2).mode).toBe('columns');
      });

      it('switches to balanced below two columns', () => {
        expect(planCategoryColumns(itemsOf(1, 2), 1).mode).toBe('balanced');
      });

      it('keeps the merged layout invariants across many generated compositions', () => {
        const RANK: Record<string, number> = { small: 0, medium: 1, large: 2 };
        let seed = 11;
        const nextRowCount = (): number => {
          seed = (seed * 16807) % 2147483647;
          return seed % 21;
        };

        for (let round = 0; round < 200; round += 1) {
          const count = 1 + (round % 25);
          const maxColumns = 2 + (round % 4);
          const source = Array.from({ length: count }, (_, index) => ({ id: `item-${index}`, rowCount: nextRowCount() }));
          const plan = planCategoryColumns(source, maxColumns);
          const columns = buildCategoryColumns(source);
          const largeCount = columns.filter(column => column.size === 'large').length;
          const groupCount = new Set(columns.filter(column => column.size !== 'large').map(column => column.size)).size;

          expect(plan.mode === 'balanced').toBe(largeCount + groupCount > maxColumns);
          if (plan.mode === 'columns') {
            expect(plan.columns.length).toBeLessThanOrEqual(maxColumns);
            expect(plan.columns.reduce((sum, column) => sum + column.items.length, 0)).toBe(count);
            expect(plan.columns.every(column => column.items.length > 0)).toBe(true);
            expect(plan.columns.map(column => RANK[column.size])).toEqual(
              [...plan.columns.map(column => RANK[column.size])].sort((a, b) => a - b),
            );
            for (const column of plan.columns) {
              expect(new Set(column.items.map(item => sizeGroupOf(item.rowCount))).size).toBe(1);
              if (column.size === 'large') expect(column.items).toHaveLength(1);
            }
          }
        }
      });
    });

    describe('desktop', () => {
      beforeEach(() => {
        const budget = TestBed.inject(BudgetService);
        budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('income'), 300000);
        budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 100000);
        renderWith({ desktop: true, width: categoryCount() * 256 });
      });

      it('renders grouped columns without accordions or shortcuts', () => {
        expect(elementOf('.columns')).not.toBeNull();
        expect(elementOf('.balanced')).toBeNull();
        expect(elementsOf('details')).toHaveLength(0);
        expect(elementOf('.shortcuts-nav')).toBeNull();
        expect(elementsOf('article.card')).toHaveLength(categoryCount());
      });

      it('sets the column count and fills every column', () => {
        const columns = elementsOf<HTMLElement>('.column');
        const grid = elementOf<HTMLElement>('.columns');
        expect(grid?.style.getPropertyValue('--column-count')).toBe(String(columns.length));
        expect(columns.every(column => column.querySelectorAll('article.card').length > 0)).toBe(true);
        expect(
          columns.reduce((sum, column) => sum + column.querySelectorAll('article.card').length, 0),
        ).toBe(categoryCount());
      });

      it('does not show internal size groups or row counts', () => {
        expect(elementOf('.column-title')).toBeNull();
        expect(elementOf('.column-rows')).toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('Petites catégories');
        expect(fixture.nativeElement.textContent).not.toContain('Lignes :');
      });

      it('falls back to the balanced layout when the columns do not fit the width', () => {
        renderWith({ desktop: true, width: 100 });
        expect(elementOf('.columns')).toBeNull();
        expect(elementOf('.balanced')).not.toBeNull();
      });

      it('keeps the two-column grid at 1280 px and falls back just below two 320 px columns', () => {
        renderWith({ desktop: true, width: 936 });
        expect(elementOf<HTMLElement>('.columns')?.style.getPropertyValue('--column-count')).toBe('2');

        renderWith({ desktop: true, width: 655 });
        expect(elementOf('.columns')).toBeNull();
        expect(elementOf('.balanced')).not.toBeNull();
      });

      it('uses the balanced layout below the desktop breakpoint', () => {
        renderWith({ desktop: false, width: categoryCount() * 256 });
        expect(elementOf('.columns')).toBeNull();
        expect(elementOf('.balanced')).not.toBeNull();
      });
    });

    describe('desktop with three columns', () => {
      const THREE_COLUMNS_MIN_WIDTH_PX = 992;

      function addSyntheticCategory(id: string, name: string, subcategoryCount: number): void {
        const categoryService = TestBed.inject(CategoryService);
        categoryService.addCategory({ id, name, type: 'expense', color: '#777777' });
        for (let index = 1; index <= subcategoryCount; index += 1) {
          categoryService.addSubcategory({
            id: `${id}-sub-${index}`,
            name: `${name} ${index}`,
            categoryId: id,
            icon: 'home',
          });
        }
      }

      /**
       * Jeu synthétique : une colonne de petites catégories (2 + 2 lignes, empaquetées) et deux grandes
       * catégories (11 et 12 lignes) isolées. Les catégories d'origine sont retirées car quatre petites
       * catégories produiraient déjà deux colonnes « petites » à elles seules.
       */
      beforeEach(() => {
        const categoryService = TestBed.inject(CategoryService);
        for (const category of categoryService.categories()) {
          categoryService.deleteCategory(category.id);
        }
        addSyntheticCategory('small-a', 'Petite A', 2);
        addSyntheticCategory('small-b', 'Petite B', 2);
        addSyntheticCategory('large-a', 'Grande A', 11);
        addSyntheticCategory('large-b', 'Grande B', 12);
        renderWith({ desktop: true, width: THREE_COLUMNS_MIN_WIDTH_PX });
      });

      it('renders three columns: the small categories, then one large category per column', () => {
        const columns = elementsOf<HTMLElement>('.column');
        expect(elementOf<HTMLElement>('.columns')?.style.getPropertyValue('--column-count')).toBe('3');
        expect(columns).toHaveLength(3);
        expect(textsOf(columns[0], '.card-name')).toEqual(['Petite A', 'Petite B']);
        expect(textsOf(columns[1], '.card-name')).toEqual(['Grande A']);
        expect(textsOf(columns[2], '.card-name')).toEqual(['Grande B']);
      });

      it('renders every category exactly once', () => {
        const names = textsOf(fixture.nativeElement, '.card-name');
        expect(names).toEqual(['Petite A', 'Petite B', 'Grande A', 'Grande B']);
        expect(elementsOf('article.card')).toHaveLength(4);
        for (const id of ['small-a', 'small-b', 'large-a', 'large-b']) {
          expect(elementsOf(`#budget-category-${id}`)).toHaveLength(1);
        }
      });

      it('leaves no column empty', () => {
        const columns = elementsOf<HTMLElement>('.column');
        expect(columns.every(column => column.querySelectorAll('article.card').length > 0)).toBe(true);
      });

      it('only uses the three-column grid when three columns of 320 px fit in the host width', () => {
        expect(elementOf('.columns')).not.toBeNull();

        renderWith({ desktop: true, width: THREE_COLUMNS_MIN_WIDTH_PX - 1 });
        expect(elementOf('.columns')).toBeNull();
        expect(elementOf('.balanced')).not.toBeNull();
      });
    });

    describe('mobile', () => {
      beforeEach(() => {
        const budget = TestBed.inject(BudgetService);
        budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('income'), 300000);
        budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 100000);
        renderMobile();
      });

      it('opens every card on first render', () => {
        const cards = elementsOf<HTMLDetailsElement>('details.card');
        expect(cards).toHaveLength(categoryCount());
        expect(cards.every(card => card.open)).toBe(true);
      });

      it('gives each shortcut a target card', () => {
        const shortcuts = elementsOf<HTMLAnchorElement>('a.shortcut');
        expect(shortcuts).toHaveLength(categoryCount());
        for (const shortcut of shortcuts) {
          expect(elementOf(shortcut.getAttribute('href') ?? '')).not.toBeNull();
        }
      });

      it('exposes the shortcuts as a labelled navigation landmark of native links', () => {
        const nav = elementOf('nav.shortcuts-nav');
        expect(nav?.getAttribute('aria-label')).toBeTruthy();
        const shortcuts = elementsOf<HTMLAnchorElement>('a.shortcut');
        expect(shortcuts.every(link => link.closest('nav') === nav)).toBe(true);
        expect(shortcuts.every(link => link.getAttribute('href')?.startsWith('#'))).toBe(true);
      });

      it('toggles a card when its summary is tapped', () => {
        const card = elementsOf<HTMLDetailsElement>('details.card')[0];
        card.querySelector('summary')?.click();
        expect(card.open).toBe(false);
        card.querySelector('summary')?.click();
        expect(card.open).toBe(true);
      });

      it('reopens a closed card from its shortcut and scrolls to it', () => {
        const scrollIntoView = vi.fn();
        stubProperty(Element.prototype, 'scrollIntoView', scrollIntoView);
        const cards = elementsOf<HTMLDetailsElement>('details.card');
        const last = cards[cards.length - 1];
        last.open = false;
        const shortcuts = elementsOf<HTMLAnchorElement>('a.shortcut');
        shortcuts[shortcuts.length - 1].click();
        expect(last.open).toBe(true);
        expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
      });

      it('shows a note on a category without subcategories', () => {
        TestBed.inject(CategoryService).addCategory({
          id: 'empty-category',
          name: 'Vide',
          type: 'expense',
          color: '#777777',
        });
        renderMobile();
        const card = cardOf('empty-category');
        expect(card?.querySelector('.lines')).toBeNull();
        expect(textsOf(card, 'p.note')).toEqual(['À compléter : aucune sous-catégorie configurée.']);
      });

      it('formats expense card totals and line amounts as positive values through MoneyPipe', () => {
        const card = cardOf(categoryIdOf('expense'));
        expect(textsOf(card, '.total-value')).toEqual([expected(100000), expected(85000)]);
        const line = lineOf(subcategoryNameOf(subcategoryIdOf('expense')));
        expect(textsOf(line, '.amount-value')).toEqual([expected(100000), expected(85000)]);
        expect(textsOf(card, '.total-value').join('')).not.toMatch(/[+\u2212-]/);
      });

      it('keeps the plus sign on positive income card totals and line amounts', () => {
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('income'), 300000);
        renderMobile();
        const summary = TestBed.inject(BudgetService).monthSummary();
        const incomeCategory = summary.categories.find(item => item.categoryId === categoryIdOf('income'));
        const incomeLine = incomeCategory?.subcategories.find(
          item => item.subcategoryId === subcategoryIdOf('income'),
        );
        const card = cardOf(categoryIdOf('income'));
        expect(textsOf(card, '.total-value')[0]).toBe(
          expected(incomeCategory?.plannedAmountCents ?? 0, 'income'),
        );
        expect(textsOf(lineOf(subcategoryNameOf(subcategoryIdOf('income'))), '.amount-value')[0]).toBe(
          expected(incomeLine?.plannedAmountCents ?? 0, 'income'),
        );
        expect(textsOf(card, '.total-value')[0].startsWith('+')).toBe(true);
      });

      it('updates card totals when a planned amount changes', () => {
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 200000);
        fixture.detectChanges();
        expect(textsOf(cardOf(categoryIdOf('expense')), '.total-value')[0]).toBe(expected(200000));
      });

      it('renders the card head totals with the Planned and Actual labels', () => {
        expect(textsOf(cardOf(categoryIdOf('expense')), '.total-label')).toEqual(['Prévu', 'Réel']);
      });

      it('renders no aggregate progress bar in any card head', () => {
        expect(elementsOf('.card-head [role="progressbar"]')).toHaveLength(0);
        expect(elementsOf('.card-head app-progress-bar')).toHaveLength(0);
      });

      it('renders a visually hidden Planned and Actual label on each line', () => {
        renderMobile();
        const line = lineOf(subcategoryNameOf(subcategoryIdOf('expense')));
        const labels = Array.from(line?.querySelectorAll<HTMLElement>('.amount-label') ?? []);
        expect(labels.map(label => label.textContent?.trim())).toEqual(['Prévu', 'Réel']);
        expect(labels.every(label => label.classList.contains('visually-hidden'))).toBe(true);
      });

      it('aligns the card head and the lines on the same track template', () => {
        renderMobile();
        const head = document.querySelector<HTMLElement>('.card-head');
        const line = lineOf(subcategoryNameOf(subcategoryIdOf('expense')));
        expect(head).not.toBeNull();
        expect(line).toBeDefined();
        const headTracks = getComputedStyle(head as HTMLElement).gridTemplateColumns;
        expect(headTracks).not.toBe('');
        expect(getComputedStyle(line as HTMLElement).gridTemplateColumns).toBe(headTracks);
      });

      it('renders the English table labels after switching language', () => {
        TestBed.inject(TranslocoService).setActiveLang('en');
        fixture.detectChanges();
        expect(elementOf('section.table-section')?.getAttribute('aria-label')).toBe('Category tracking');
        expect(elementOf('.shortcuts-nav')?.getAttribute('aria-label')).toBe('Quick access to categories');
        expect(textsOf(cardOf(categoryIdOf('expense')), '.total-label')).toEqual(['Planned', 'Actual']);
      });
    });

    describe('line progress', () => {
      beforeEach(() => {
        // Mock data already spends 850 € on this subcategory this month.
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 100000);
      });

      function addActual(amountCents: number): void {
        TestBed.inject(TransactionService).add({
          label: 'Test',
          categoryId: categoryIdOf('expense'),
          subcategoryId: subcategoryIdOf('expense'),
          date: `${TEST_MONTH}-15`,
          amountCents,
          type: 'expense',
        });
      }

      function expenseLine(): HTMLElement | undefined {
        return lineOf(subcategoryNameOf(subcategoryIdOf('expense')));
      }

      it('reports under-consumption below 80 percent of the planned amount', () => {
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 170000);
        renderMobile();
        const line = expenseLine();
        const bar = line?.querySelector('[role="progressbar"]');
        expect(bar?.getAttribute('aria-valuenow')).toBe('50');
        expect(bar?.getAttribute('aria-label')).toBe(
          `Progression de ${subcategoryNameOf(subcategoryIdOf('expense'))}`,
        );
        expect(line?.querySelector('.fill')?.classList.contains('under')).toBe(true);
      });

      it('reports on-track consumption between 80 and 100 percent', () => {
        renderMobile();
        const line = expenseLine();
        expect(line?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('85');
        expect(line?.querySelector('.fill')?.classList.contains('on-track')).toBe(true);
      });

      it('reports overspending and caps the progress value at 100', () => {
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 50000);
        renderMobile();
        const line = expenseLine();
        const bar = line?.querySelector('[role="progressbar"]');
        expect(bar?.getAttribute('aria-valuenow')).toBe('100');
        expect(bar?.getAttribute('aria-valuetext')).toBe(
          `Réel ${expected(85000)} sur ${expected(50000)} prévus`,
        );
        expect(line?.querySelector('.fill')?.classList.contains('over')).toBe(true);
      });

      it('shows Not set in the planned cell without a progress bar when the planned amount is zero', () => {
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 0);
        addActual(5000);
        renderMobile();
        const line = expenseLine();
        expect(textsOf(line, '.planned-button')).toEqual(['Non renseigné']);
        expect(line?.querySelector('p.note')).toBeNull();
        expect(line?.querySelector('[role="progressbar"]')).toBeNull();
        expect(textsOf(line, '.amount-value')).toContain(expected(90000));
      });

      describe('income tone', () => {
        function incomeLine(): HTMLElement | undefined {
          return lineOf(subcategoryNameOf(subcategoryIdOf('income')));
        }

        function incomeActualCents(): number {
          const summary = TestBed.inject(BudgetService).monthSummary();
          const category = summary.categories.find(item => item.categoryId === categoryIdOf('income'));
          return category?.subcategories.find(item => item.subcategoryId === subcategoryIdOf('income'))
            ?.actualAmountCents ?? 0;
        }

        function setIncomeConsumption(rate: number): void {
          const plannedCents = Math.round(incomeActualCents() / rate);
          TestBed.inject(BudgetService).setPlannedAmount(
            TEST_MONTH,
            subcategoryIdOf('income'),
            plannedCents,
          );
          renderMobile();
        }

        beforeEach(() => {
          TestBed.inject(TransactionService).add({
            label: 'Test income',
            categoryId: categoryIdOf('income'),
            subcategoryId: subcategoryIdOf('income'),
            date: `${TEST_MONTH}-15`,
            amountCents: 10000,
            type: 'income',
          });
        });

        it('shows an under-received income in the red tone', () => {
          setIncomeConsumption(0.5);
          const line = incomeLine();
          expect(line?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('50');
          expect(line?.querySelector('.fill')?.classList.contains('over')).toBe(true);
          expect(line?.querySelector('.fill')?.classList.contains('under')).toBe(false);
        });

        it('keeps the amber tone for an on-track income', () => {
          setIncomeConsumption(0.9);
          const line = incomeLine();
          expect(line?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('90');
          expect(line?.querySelector('.fill')?.classList.contains('on-track')).toBe(true);
        });

        it('shows an over-received income in the green tone', () => {
          setIncomeConsumption(2);
          const line = incomeLine();
          expect(line?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
          expect(line?.querySelector('.fill')?.classList.contains('under')).toBe(true);
          expect(line?.querySelector('.fill')?.classList.contains('over')).toBe(false);
        });
      });

    });

    describe('inline planned edit', () => {
      beforeEach(() => {
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 1050);
        renderMobile();
      });

      function expenseLine(): HTMLElement | undefined {
        return lineOf(subcategoryNameOf(subcategoryIdOf('expense')));
      }

      function plannedButton(): HTMLButtonElement | null {
        return expenseLine()?.querySelector<HTMLButtonElement>('.planned-button') ?? null;
      }

      function plannedInput(): HTMLInputElement | null {
        return expenseLine()?.querySelector<HTMLInputElement>('input.planned-input') ?? null;
      }

      function clearButton(): HTMLButtonElement | null {
        return expenseLine()?.querySelector<HTMLButtonElement>('.planned-clear') ?? null;
      }

      function openEditor(): HTMLInputElement {
        plannedButton()?.click();
        fixture.detectChanges();
        const input = plannedInput();
        if (!input) {
          throw new Error('Planned input is not rendered');
        }
        return input;
      }

      function press(input: HTMLInputElement, key: string): void {
        input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        fixture.detectChanges();
      }

      function spyOnSetPlannedAmount() {
        return vi.spyOn(TestBed.inject(BudgetService), 'setPlannedAmount');
      }

      it('opens with the current planned amount and focuses the input', async () => {
        const input = openEditor();
        await fixture.whenStable();
        expect(input.value).toBe('10,5');
        expect(document.activeElement).toBe(input);
      });

      it('saves the amount on Enter through BudgetService.setPlannedAmount', async () => {
        const spy = spyOnSetPlannedAmount();
        const input = openEditor();
        input.value = '12,5';
        press(input, 'Enter');
        await fixture.whenStable();
        expect(spy).toHaveBeenCalledWith(TEST_MONTH, subcategoryIdOf('expense'), 1250);
        expect(plannedInput()).toBeNull();
        expect(plannedButton()?.textContent?.trim()).toBe(expected(1250));
        expect(document.activeElement).toBe(plannedButton());
      });

      it('accepts the minimum positive amount of one cent (0,01 euro)', () => {
        const spy = spyOnSetPlannedAmount();
        const input = openEditor();
        input.value = '0,01';
        press(input, 'Enter');
        expect(spy).toHaveBeenCalledWith(TEST_MONTH, subcategoryIdOf('expense'), 1);
      });

      it.each([
        { raw: '12,34', cents: 1234 },
        { raw: '12.34', cents: 1234 },
        { raw: '0,1', cents: 10 },
        { raw: '100', cents: 10000 },
      ])('saves the typed draft $raw as exactly $cents cents', ({ raw, cents }) => {
        const spy = spyOnSetPlannedAmount();
        const input = openEditor();
        input.value = raw;
        press(input, 'Enter');
        expect(spy).toHaveBeenCalledWith(TEST_MONTH, subcategoryIdOf('expense'), cents);
      });

      it('accepts the largest safe amount in cents and shows it back exactly', () => {
        const spy = spyOnSetPlannedAmount();
        const input = openEditor();
        input.value = '90071992547409.91';
        press(input, 'Enter');
        expect(spy).toHaveBeenCalledWith(TEST_MONTH, subcategoryIdOf('expense'), Number.MAX_SAFE_INTEGER);
        expect(plannedInput()).toBeNull();
        expect(plannedButton()?.textContent?.trim()).toBe(expected(Number.MAX_SAFE_INTEGER));
      });

      it.each(['', '0', '0,00'])('removes the planned amount when the draft is %j', raw => {
        const spy = spyOnSetPlannedAmount();
        const input = openEditor();
        input.value = raw;
        press(input, 'Enter');
        expect(spy).toHaveBeenCalledWith(TEST_MONTH, subcategoryIdOf('expense'), 0);
        expect(plannedButton()?.textContent?.trim()).toBe('Non renseigné');
      });

      it.each(['-5', '-0', '-0,01', 'abc', '0,001', '1,2,3', '.5', '1.234', '12,345', '90071992547409.92'])(
        'rejects the draft %j without saving',
        raw => {
          const spy = spyOnSetPlannedAmount();
          const input = openEditor();
          input.value = raw;
          press(input, 'Enter');
          expect(spy).not.toHaveBeenCalled();
          expect(plannedInput()?.value).toBe(raw);
          expect(plannedInput()?.getAttribute('aria-invalid')).toBe('true');
          expect(elementOf<HTMLElement>('[role="alert"]')?.textContent?.trim()).toBe(
            'Montant invalide : saisissez 0 ou un montant d’au moins 0,01 €, avec deux décimales maximum.',
          );
        },
      );

      it('keeps the editor open with the localized error when the aggregate would overflow, without throwing', () => {
        const budget = TestBed.inject(BudgetService);
        budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 0);
        budget.setPlannedAmount(TEST_MONTH, 'sub-3', Number.MAX_SAFE_INTEGER);
        fixture.detectChanges();
        const errorSpy = vi.spyOn(console, 'error');
        const linesBefore = budget.lines();

        const input = openEditor();
        input.value = '0,01';
        press(input, 'Enter');

        expect(errorSpy).not.toHaveBeenCalled();
        expect(budget.lines()).toBe(linesBefore);
        expect(budget.plannedCentsFor(TEST_MONTH, subcategoryIdOf('expense'))).toBe(0);
        expect(plannedInput()?.value).toBe('0,01');
        expect(plannedInput()?.getAttribute('aria-invalid')).toBe('true');
        expect(document.activeElement).toBe(plannedInput());
        expect(elementOf<HTMLElement>('[role="alert"]')?.textContent?.trim()).toBe(
          'Montant refusé : le total prévu de la catégorie ou du mois dépasserait la capacité de calcul exacte de l’application. Saisissez un montant plus petit.',
        );
      });

      it('closes the editor on Escape after an aggregate refusal, without saving', async () => {
        const budget = TestBed.inject(BudgetService);
        budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 0);
        budget.setPlannedAmount(TEST_MONTH, 'sub-3', Number.MAX_SAFE_INTEGER);
        fixture.detectChanges();
        const spy = spyOnSetPlannedAmount();

        const input = openEditor();
        input.value = '0,01';
        press(input, 'Enter');
        expect(plannedInput()).not.toBeNull();

        press(plannedInput() ?? input, 'Escape');
        await fixture.whenStable();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(plannedInput()).toBeNull();
        expect(plannedButton()?.textContent?.trim()).toBe('Non renseigné');
        expect(document.activeElement).toBe(plannedButton());
      });

      it('cancels on Escape without saving and restores focus to the button', async () => {
        const spy = spyOnSetPlannedAmount();
        const input = openEditor();
        input.value = '99';
        press(input, 'Escape');
        await fixture.whenStable();
        expect(spy).not.toHaveBeenCalled();
        expect(plannedInput()).toBeNull();
        expect(plannedButton()?.textContent?.trim()).toBe(expected(1050));
        expect(document.activeElement).toBe(plannedButton());
      });

      it('cancels when the input loses focus without saving', () => {
        const spy = spyOnSetPlannedAmount();
        const input = openEditor();
        input.value = '99';
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();
        expect(spy).not.toHaveBeenCalled();
        expect(plannedInput()).toBeNull();
        expect(plannedButton()?.textContent?.trim()).toBe(expected(1050));
      });

      it('labels the controls in French and English', async () => {
        const name = subcategoryNameOf(subcategoryIdOf('expense'));
        const value = expected(1050);
        expect(plannedButton()?.getAttribute('aria-label')).toBe(`Modifier le prévu pour ${name} (${value})`);

        TestBed.inject(TranslocoService).setActiveLang('en');
        fixture.detectChanges();
        await fixture.whenStable();
        expect(plannedButton()?.getAttribute('aria-label')).toBe(`Edit planned amount for ${name} (${value})`);

        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 0);
        fixture.detectChanges();
        expect(plannedButton()?.textContent?.trim()).toBe('Not set');
      });

      it('keeps the numeric keyboard hints on the planned input', () => {
        const input = openEditor();
        expect(input.getAttribute('inputmode')).toBe('decimal');
        expect(input.getAttribute('enterkeyhint')).toBe('done');
      });

      it('shows the clear control only while editing', () => {
        expect(clearButton()).toBeNull();
        openEditor();
        const name = subcategoryNameOf(subcategoryIdOf('expense'));
        expect(clearButton()?.getAttribute('aria-label')).toBe(`Effacer le prévu pour ${name}`);
      });

      it('prevents the mousedown default so the clear control keeps the input focused', () => {
        openEditor();
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        clearButton()?.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
      });

      it('saves zero immediately from the clear control, closes the editor and focuses the button', async () => {
        const spy = spyOnSetPlannedAmount();
        const input = openEditor();
        input.value = '42';
        clearButton()?.click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(TEST_MONTH, subcategoryIdOf('expense'), 0);
        expect(plannedInput()).toBeNull();
        expect(clearButton()).toBeNull();
        expect(plannedButton()?.textContent?.trim()).toBe('Non renseigné');
        expect(document.activeElement).toBe(plannedButton());
      });

      it('does not restore the previous amount after the clear control, even on later Escape or blur', async () => {
        const spy = spyOnSetPlannedAmount();
        const input = openEditor();
        clearButton()?.click();
        fixture.detectChanges();
        await fixture.whenStable();

        press(input, 'Escape');
        input.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
        fixture.detectChanges();
        await fixture.whenStable();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(TEST_MONTH, subcategoryIdOf('expense'), 0);
        expect(plannedButton()?.textContent?.trim()).toBe('Non renseigné');
      });

      it('saves zero from the clear control even when the draft holds an invalid value', async () => {
        const spy = spyOnSetPlannedAmount();
        const input = openEditor();
        input.value = '-5';
        press(input, 'Enter');
        expect(elementOf<HTMLElement>('[role="alert"]')).not.toBeNull();
        clearButton()?.click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(spy).toHaveBeenLastCalledWith(TEST_MONTH, subcategoryIdOf('expense'), 0);
        expect(elementOf<HTMLElement>('[role="alert"]')).toBeNull();
        expect(plannedInput()).toBeNull();
      });

      it('cancels on Escape from the clear control without saving the draft', async () => {
        const spy = spyOnSetPlannedAmount();
        openEditor();
        clearButton()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        fixture.detectChanges();
        await fixture.whenStable();
        expect(spy).not.toHaveBeenCalled();
        expect(plannedInput()).toBeNull();
        expect(plannedButton()?.textContent?.trim()).toBe(expected(1050));
      });

      it('keeps editing when focus moves from the input to the clear control', () => {
        const input = openEditor();
        input.dispatchEvent(new FocusEvent('blur', { relatedTarget: clearButton() }));
        fixture.detectChanges();
        expect(plannedInput()).not.toBeNull();
      });

      it('keeps the unset label on one line and the resting control without a solid fill', () => {
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 0);
        fixture.detectChanges();
        const label = plannedButton()?.querySelector<HTMLElement>('.amount-value');
        expect(label).not.toBeNull();
        expect(getComputedStyle(label as HTMLElement).whiteSpace).toBe('nowrap');
        expect(getComputedStyle(plannedButton() as HTMLButtonElement).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      });

      it('extends the planned button past its track so the amount text aligns with the card head', () => {
        const style = getComputedStyle(plannedButton() as HTMLButtonElement);
        expect(style.width).toContain('calc(100% + var(--space-sm) + var(--border-width))');
        expect(style.minHeight).toBe('var(--size-touch-min)');
      });

      it('renders the planned input without border or fill while editing', () => {
        const input = openEditor();
        const style = getComputedStyle(input);
        expect(['0', '0px']).toContain(style.borderTopWidth);
        expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      });

      it('places the clear control in the same container as the input, on the trailing edge', () => {
        const input = openEditor();
        const clear = clearButton();
        expect(clear).not.toBeNull();
        expect(input.parentElement?.classList.contains('planned-edit')).toBe(true);
        expect(clear?.parentElement).toBe(input.parentElement);
        expect(getComputedStyle(clear as HTMLElement).position).toBe('absolute');
        expect(getComputedStyle(clear as HTMLElement).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      });

      it('keeps the clear control as a real button, not nested inside the input', () => {
        openEditor();
        expect(clearButton()?.tagName).toBe('BUTTON');
        expect(clearButton()?.getAttribute('type')).toBe('button');
        expect(clearButton()?.querySelector('input')).toBeNull();
      });

      it('labels the clear control in English', async () => {
        TestBed.inject(TranslocoService).setActiveLang('en');
        fixture.detectChanges();
        await fixture.whenStable();
        openEditor();
        const name = subcategoryNameOf(subcategoryIdOf('expense'));
        expect(clearButton()?.getAttribute('aria-label')).toBe(`Clear planned amount for ${name}`);
      });
    });
  });

  describe('opening balance', () => {
    function openingSection(): HTMLElement | null {
      return fixture.nativeElement.querySelector('.opening');
    }

    function openingButton(selector: string): HTMLButtonElement | null {
      return openingSection()?.querySelector<HTMLButtonElement>(selector) ?? null;
    }

    function prepareButton(): HTMLButtonElement | null {
      return openingButton('.opening-action-primary');
    }

    function adjustButton(): HTMLButtonElement | null {
      return openingButton('#budget-opening-adjust');
    }

    function resetButton(): HTMLButtonElement | null {
      return openingButton('.opening-action-reset');
    }

    function signButton(): HTMLButtonElement | null {
      return fixture.nativeElement.querySelector('.opening-sign') ?? null;
    }

    function openingInput(): HTMLInputElement | null {
      return fixture.nativeElement.querySelector('input.opening-input') ?? null;
    }

    function errorElement(): HTMLElement | null {
      return openingSection()?.querySelector<HTMLElement>('.opening-error') ?? null;
    }

    function statusText(): string {
      return openingSection()?.querySelector('.opening-badge')?.textContent?.trim() ?? '';
    }

    /** Le montant d'ouverture n'apparaît qu'une fois, dans l'équation. */
    function openedAmountText(): string {
      return equationValues()[0] ?? '';
    }

    function indicativeText(): string {
      return equationValues()[0] ?? '';
    }

    function openEditor(): HTMLInputElement {
      adjustButton()?.click();
      fixture.detectChanges();
      const input = openingInput();
      if (!input) {
        throw new Error('Opening balance input is not rendered');
      }
      return input;
    }

    function press(input: HTMLInputElement, key: string): void {
      input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    }

    function spyOnSetOpeningBalanceOverride() {
      return vi.spyOn(TestBed.inject(BudgetService), 'setOpeningBalanceOverride');
    }

    function monthOf(monthKey: string) {
      return TestBed.inject(BudgetService).months().find(month => month.monthKey === monthKey);
    }

    describe('layout and accessibility', () => {
      it('labels the rail with its heading and keeps help and prepare action inside it', () => {
        fixture.detectChanges();
        const section = openingSection();
        const heading = section?.querySelector('h2');
        expect(section?.getAttribute('aria-labelledby')).toBe(heading?.id);
        expect(heading?.textContent?.trim().length).toBeGreaterThan(0);
        expect(section?.querySelector('.opening-help')).not.toBeNull();
        expect(section?.querySelector('.opening-actions .opening-action-primary')).not.toBeNull();
        expect(section?.querySelector('.opening-amount, .opening-item, .opening-main')).toBeNull();
      });

      it('exposes the prepared-state actions as named buttons inside the rail', () => {
        prepareButton()?.click();
        fixture.detectChanges();
        const section = openingSection();
        expect(section?.querySelector('.opening-help')?.textContent?.trim()).toBe(
          'Ajuster le solde d\'ouverture manuellement ou revenir au calcul automatique',
        );
        expect(adjustButton()?.getAttribute('type')).toBe('button');
        expect(adjustButton()?.textContent?.trim().length).toBeGreaterThan(0);
        expect(section?.querySelector('#budget-opening-adjust')).not.toBeNull();
      });
    });

    describe('before preparation', () => {
      it('does not open a month when rendered or when the selected month changes', () => {
        const spy = vi.spyOn(TestBed.inject(BudgetService), 'openMonth');
        expect(prepareButton()).not.toBeNull();
        expect(adjustButton()).toBeNull();
        expect(resetButton()).toBeNull();

        TestBed.inject(MonthContextService).setMonth('2026-08');
        fixture.detectChanges();

        expect(spy).not.toHaveBeenCalled();
        expect(TestBed.inject(BudgetService).isMonthOpened('2026-08')).toBe(false);
        expect(prepareButton()).not.toBeNull();
      });

      it('shows the indicative opening as zero when the previous month is not initialised', () => {
        expect(TestBed.inject(BudgetService).isMonthOpened('2026-06')).toBe(false);
        expect(statusText()).toBe('Mois non préparé');
        expect(indicativeText()).toBe(expected(0));
      });

      it('prepares the month only through the explicit action', async () => {
        const spy = vi.spyOn(TestBed.inject(BudgetService), 'openMonth');
        prepareButton()?.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(TEST_MONTH);
        expect(TestBed.inject(BudgetService).isMonthOpened(TEST_MONTH)).toBe(true);
        expect(prepareButton()).toBeNull();
        expect(adjustButton()).not.toBeNull();
        expect(statusText()).toBe('Automatique');
        expect(document.activeElement).toBe(adjustButton());
      });

      it('labels the unprepared state in English', async () => {
        TestBed.inject(TranslocoService).setActiveLang('en');
        fixture.detectChanges();
        await fixture.whenStable();

        expect(openingSection()?.querySelector('h2')?.textContent?.trim()).toBe('Month preparation');
        expect(statusText()).toBe('Month not prepared');
        expect(prepareButton()?.textContent?.trim()).toBe('Prepare month');
      });
    });

    describe('preparation with recurring rules', () => {
      function plannedButtonFor(subcategoryId: string): HTMLButtonElement | null {
        return fixture.nativeElement.querySelector(`#budget-planned-${subcategoryId}`);
      }

      it('shows active recurring rules as planned lines after preparation', async () => {
        prepareButton()?.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(plannedButtonFor('sub-1')?.textContent?.trim()).toBe(expected(245000, 'income'));
        expect(plannedButtonFor('sub-2')?.textContent?.trim()).toBe(expected(85000));
        expect(plannedButtonFor('sub-3')?.textContent?.trim()).toBe(expected(3999));
        expect(equationValues()).toEqual([
          expected(0),
          expected(245000),
          expected(88999),
          expected(156001),
          expected(156001),
        ]);
      });

      it('keeps planned lines unset when no recurring rule is active', async () => {
        vi.spyOn(TestBed.inject(RecurringRuleService), 'activeRulesForMonth').mockReturnValue([]);
        prepareButton()?.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(TestBed.inject(BudgetService).isMonthOpened(TEST_MONTH)).toBe(true);
        expect(plannedButtonFor('sub-1')?.textContent?.trim()).toBe('Non renseigné');
        expect(plannedButtonFor('sub-2')?.textContent?.trim()).toBe('Non renseigné');
        expect(equationValues()).toEqual([expected(0), expected(0), expected(0), expected(0), expected(0)]);
      });
    });

    describe('refused preparation for aggregate overflow', () => {
      const overflowingRules = (): RecurringRule[] => [
        {
          id: 'rule-big',
          seriesId: 'series-big',
          label: 'Grosse règle',
          categoryId: 'cat-2',
          subcategoryId: 'sub-2',
          amountCents: Number.MAX_SAFE_INTEGER - 100,
          startMonth: TEST_MONTH,
          active: true,
        },
        {
          id: 'rule-over',
          seriesId: 'series-over',
          label: 'Règle qui dépasse',
          categoryId: 'cat-2',
          subcategoryId: 'sub-3',
          amountCents: 200,
          startMonth: TEST_MONTH,
          active: true,
        },
      ];

      function refusalAlert(): HTMLElement | null {
        return openingSection()?.querySelector<HTMLElement>('[role="alert"]') ?? null;
      }

      beforeEach(() => {
        vi.spyOn(TestBed.inject(RecurringRuleService), 'activeRulesForMonth').mockReturnValue(overflowingRules());
      });

      it('keeps the month unprepared, shows the dedicated alert and does not throw', async () => {
        const errorSpy = vi.spyOn(console, 'error');
        prepareButton()?.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(TestBed.inject(BudgetService).isMonthOpened(TEST_MONTH)).toBe(false);
        expect(TestBed.inject(BudgetService).lines()).toEqual([]);
        expect(statusText()).toBe('Mois non préparé');
        expect(prepareButton()).not.toBeNull();
        expect(adjustButton()).toBeNull();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(refusalAlert()?.textContent?.trim()).toBe(
          'Préparation refusée : les récurrences actives dépassent la capacité de calcul exacte de l’application. Réduisez leurs montants pour préparer le mois.',
        );
        expect(prepareButton()?.getAttribute('aria-describedby')).toBe(refusalAlert()?.id);
      });

      it('clears the alert and prepares the month once the rules fit again', async () => {
        prepareButton()?.click();
        fixture.detectChanges();
        expect(refusalAlert()).not.toBeNull();

        vi.spyOn(TestBed.inject(RecurringRuleService), 'activeRulesForMonth').mockReturnValue([]);
        prepareButton()?.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(TestBed.inject(BudgetService).isMonthOpened(TEST_MONTH)).toBe(true);
        expect(refusalAlert()).toBeNull();
        expect(adjustButton()).not.toBeNull();
      });

      it('hides the alert when the selected month changes', () => {
        prepareButton()?.click();
        fixture.detectChanges();
        expect(refusalAlert()).not.toBeNull();

        TestBed.inject(MonthContextService).setMonth('2026-08');
        fixture.detectChanges();

        expect(refusalAlert()).toBeNull();
        expect(TestBed.inject(BudgetService).isMonthOpened('2026-08')).toBe(false);
      });
    });

    describe('when prepared', () => {
      let budget: BudgetService;

      beforeEach(() => {
        budget = TestBed.inject(BudgetService);
        budget.openMonth(TEST_MONTH);
        fixture.detectChanges();
      });

      it('shows the opening balance through MoneyPipe in the automatic state', () => {
        expect(openedAmountText()).toBe(expected(0));
        expect(statusText()).toBe('Automatique');
        expect(prepareButton()).toBeNull();
        expect(resetButton()).toBeNull();
      });

      it('prefills the editor with the current balance and focuses it', async () => {
        const input = openEditor();
        await fixture.whenStable();
        expect(input.value).toBe('0');
        expect(document.activeElement).toBe(input);
      });

      it('places the opening editor inside the equation only, and shows the opening value once', () => {
        openEditor();

        expect(fixture.nativeElement.querySelector('.equation-formula input.opening-input')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.overview-preparation input')).toBeNull();
        expect(fixture.nativeElement.querySelectorAll('.equation-formula .equation-value')).toHaveLength(3);
      });

      describe('closing preview while editing the opening balance', () => {
        function typeDraft(raw: string): void {
          const input = openEditor();
          input.value = raw;
          input.dispatchEvent(new Event('input'));
          fixture.detectChanges();
        }

        function closingText(): string {
          return fixture.nativeElement.querySelector('.equation-result .equation-value')?.textContent?.trim() ?? '';
        }

        it.each([
          { raw: '12,5', cents: 1250 },
          { raw: '0', cents: 0 },
          { raw: '-3', cents: -300 },
        ])('recomputes the closing balance from the draft "$raw" in real time', ({ raw, cents }) => {
          typeDraft(raw);
          const summary = TestBed.inject(BudgetService).monthSummary();
          const flowCents = summary.incomePlannedCents - summary.expensePlannedCents;

          expect(closingText()).toBe(expected(cents + flowCents));
        });

        it('shows the invalid-draft alert instead of a closing value for an incomplete entry', () => {
          typeDraft('abc');

          const alert: HTMLElement | null = fixture.nativeElement.querySelector('.equation-note-alert');
          expect(alert?.getAttribute('role')).toBe('status');
          expect(fixture.nativeElement.querySelector('.equation-result .equation-value')).toBeNull();
        });

        it('restores the saved closing balance when the draft is cancelled', () => {
          const spy = spyOnSetOpeningBalanceOverride();
          const input = openEditor();
          input.value = '12,5';
          input.dispatchEvent(new Event('input'));
          fixture.detectChanges();
          press(input, 'Escape');

          expect(spy).not.toHaveBeenCalled();
          expect(fixture.nativeElement.querySelector('.equation-formula input.opening-input')).toBeNull();
          expect(closingText()).toBe(expected(budgetedClosingCents() ?? 0));
        });
      });

      it('saves a positive amount in cents through BudgetService', async () => {
        const spy = spyOnSetOpeningBalanceOverride();
        const input = openEditor();
        input.value = '12,5';
        press(input, 'Enter');
        await fixture.whenStable();

        expect(spy).toHaveBeenCalledWith(TEST_MONTH, 1250);
        expect(openingInput()).toBeNull();
        expect(openedAmountText()).toBe(expected(1250));
        expect(statusText()).toBe('Ajusté manuellement');
        expect(resetButton()).not.toBeNull();
      });

      it('saves a typed negative amount in cents through BudgetService', async () => {
        const spy = spyOnSetOpeningBalanceOverride();
        const input = openEditor();
        input.value = `${MINUS_SIGN}7.25`;
        press(input, 'Enter');
        await fixture.whenStable();

        expect(spy).toHaveBeenCalledWith(TEST_MONTH, -725);
        expect(openedAmountText()).toBe(expected(-725));
      });

      it('toggles the sign of the draft with the sign control before saving', async () => {
        const spy = spyOnSetOpeningBalanceOverride();
        const input = openEditor();
        input.value = '12.5';
        signButton()?.click();
        fixture.detectChanges();
        expect(input.value).toBe('-12.5');
        expect(document.activeElement).toBe(input);

        press(input, 'Enter');
        await fixture.whenStable();
        expect(spy).toHaveBeenCalledWith(TEST_MONTH, -1250);
      });

      it('saves a manual zero as an override distinct from automatic mode', async () => {
        const spy = spyOnSetOpeningBalanceOverride();
        const input = openEditor();
        input.value = '0';
        press(input, 'Enter');
        await fixture.whenStable();

        expect(spy).toHaveBeenCalledWith(TEST_MONTH, 0);
        expect(monthOf(TEST_MONTH)?.openingBalanceOverridden).toBe(true);
        expect(statusText()).toBe('Ajusté manuellement');
        expect(resetButton()).not.toBeNull();
      });

      it('normalises a typed -0 to a positive zero before saving', async () => {
        const spy = spyOnSetOpeningBalanceOverride();
        const input = openEditor();
        input.value = '-0';
        press(input, 'Enter');
        await fixture.whenStable();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(Object.is(spy.mock.calls[0][1], 0)).toBe(true);
      });

      it.each(['', 'abc', '1.234', '-', '12,345'])(
        'rejects "%s" with a localised error without calling the service',
        async raw => {
          const spy = spyOnSetOpeningBalanceOverride();
          const input = openEditor();
          input.value = raw;
          press(input, 'Enter');
          await fixture.whenStable();

          expect(spy).not.toHaveBeenCalled();
          expect(openingInput()).not.toBeNull();
          expect(openingInput()?.getAttribute('aria-invalid')).toBe('true');
          expect(errorElement()?.getAttribute('role')).toBe('alert');
          expect(errorElement()?.textContent?.trim()).toBe(
            'Montant invalide : saisissez un montant en euros, avec deux décimales maximum (ex. -12,50).',
          );
        },
      );

      it.each([
        { label: 'an input that overflows to Infinity', raw: '9'.repeat(400) },
        { label: 'a negative input that overflows to -Infinity', raw: `-${'9'.repeat(400)}` },
        { label: 'a finite amount whose cents are not a safe integer', raw: `1${'0'.repeat(300)}` },
        { label: 'an amount whose cents exceed the safe integer range', raw: '90071992547410' },
        { label: 'a decimal amount whose exact cents exceed the safe integer range', raw: '90071992547409.92' },
        { label: 'a negative decimal amount whose exact cents exceed the safe integer range', raw: '-90071992547409.92' },
      ])(
        'rejects $label with a localised error without calling the service',
        async ({ raw }) => {
          const spy = spyOnSetOpeningBalanceOverride();
          const input = openEditor();
          input.value = raw;
          press(input, 'Enter');
          await fixture.whenStable();

          expect(spy).not.toHaveBeenCalled();
          expect(openingInput()).not.toBeNull();
          expect(openingInput()?.value).toBe(raw);
          expect(openingInput()?.getAttribute('aria-invalid')).toBe('true');
          expect(errorElement()?.getAttribute('role')).toBe('alert');
          expect(errorElement()?.textContent?.trim()).toBe(
            'Montant trop grand pour être enregistré : saisissez une valeur plus petite.',
          );
        },
      );

      it.each([
        { raw: '90071992547409', cents: 9007199254740900 },
        { raw: '90071992547409.89', cents: 9007199254740989 },
        { raw: '90071992547409.90', cents: 9007199254740990 },
        { raw: '90071992547409.91', cents: 9007199254740991 },
        { raw: '-90071992547409.91', cents: -9007199254740991 },
      ])('saves $raw as the exact $cents cents when they stay safe', async ({ raw, cents }) => {
        const spy = spyOnSetOpeningBalanceOverride();
        const input = openEditor();
        input.value = raw;
        press(input, 'Enter');
        await fixture.whenStable();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0]).toEqual([TEST_MONTH, cents]);
        expect(openingInput()).toBeNull();
      });

      it('cancels on Escape without saving', () => {
        const spy = spyOnSetOpeningBalanceOverride();
        const input = openEditor();
        input.value = '5';
        press(input, 'Escape');

        expect(spy).not.toHaveBeenCalled();
        expect(openingInput()).toBeNull();
        expect(openedAmountText()).toBe(expected(0));
      });

      it('cancels on blur without saving', () => {
        const spy = spyOnSetOpeningBalanceOverride();
        const input = openEditor();
        input.value = '5';
        input.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
        fixture.detectChanges();

        expect(spy).not.toHaveBeenCalled();
        expect(openingInput()).toBeNull();
        expect(openedAmountText()).toBe(expected(0));
      });

      it('returns to automatic calculation through clearOpeningBalanceOverride', async () => {
        budget.setOpeningBalanceOverride(TEST_MONTH, 5000);
        fixture.detectChanges();
        expect(statusText()).toBe('Ajusté manuellement');

        const spy = vi.spyOn(budget, 'clearOpeningBalanceOverride');
        resetButton()?.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(spy).toHaveBeenCalledWith(TEST_MONTH);
        expect(monthOf(TEST_MONTH)?.openingBalanceOverridden).toBe(false);
        expect(statusText()).toBe('Automatique');
        expect(openedAmountText()).toBe(expected(0));
        expect(resetButton()).toBeNull();
      });

      it('labels the prepared state and the editor in English', async () => {
        TestBed.inject(TranslocoService).setActiveLang('en');
        fixture.detectChanges();
        await fixture.whenStable();

        expect(statusText()).toBe('Automatic');
        expect(adjustButton()?.textContent?.trim()).toBe('Adjust');
        expect(fixture.nativeElement.querySelector('.equation-note')).toBeNull();
        expect(fixture.nativeElement.querySelector('.equation-secondary')?.getAttribute('aria-label')).toBe('Unallocated amount');
        const input = openEditor();
        expect(input.getAttribute('aria-label')).toBe('Adjusted opening balance, in euros');
        expect(signButton()?.getAttribute('aria-label')).toBe('Switch sign (positive or negative)');
      });
    });
  });
});

