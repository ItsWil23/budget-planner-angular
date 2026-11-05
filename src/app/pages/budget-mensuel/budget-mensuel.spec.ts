import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { MoneyPipe } from '../../components/ui/money-pipe/money-pipe';
import { CategoryType } from '../../models/category';
import { BudgetService } from '../../services/budget';
import { CategoryService } from '../../services/category';
import { MoneyService } from '../../services/money';
import { MonthContextService } from '../../services/month-context';
import { SettingsService } from '../../services/settings';
import { TransactionService } from '../../services/transaction';
import { BudgetMensuel, buildCategoryColumns, sizeGroupOf, type ColumnSpec } from './budget-mensuel';

const TEST_MONTH = '2026-07';
const MINUS_SIGN = '\u2212';

const FR_TRANSLATIONS = {
  budgetMensuel: {
    allocation: {
      label: 'Allocation du mois',
      income: 'Revenus prévus',
      expense: 'Dépenses prévues',
      unallocated: 'Montant non alloué',
    },
    table: {
      label: 'Suivi par catégorie',
      columns: { subcategory: 'Sous-catégories', planned: 'Prévu', actual: 'Réel' },
      noSubcategory: 'À compléter : aucune sous-catégorie configurée.',
      realWithoutPlanned: 'Réel sans prévu',
      shortcuts: 'Accès rapide aux catégories',
      progress: { label: 'Progression de {{ name }}', value: 'Réel {{ actual }} sur {{ planned }} prévus' },
    },
  },
};

const EN_TRANSLATIONS = {
  budgetMensuel: {
    allocation: {
      label: 'Monthly allocation',
      income: 'Planned income',
      expense: 'Planned expenses',
      unallocated: 'Unallocated amount',
    },
    table: {
      label: 'Category tracking',
      columns: { subcategory: 'Subcategories', planned: 'Planned', actual: 'Actual' },
      noSubcategory: 'To complete: no subcategory configured.',
      realWithoutPlanned: 'Actual without planned',
      shortcuts: 'Quick access to categories',
      progress: { label: 'Progress of {{ name }}', value: 'Actual {{ actual }} of {{ planned }} planned' },
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

  function metricValues(): string[] {
    const cells: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.metric-value');
    return Array.from(cells, (cell: HTMLElement) => cell.textContent?.trim() ?? '');
  }

  function metricLabels(): string[] {
    const cells: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.metric-label');
    return Array.from(cells, (cell: HTMLElement) => cell.textContent?.trim() ?? '');
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

  it('exposes a labelled read-only section', () => {
    const section: HTMLElement | null = fixture.nativeElement.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe('Allocation du mois');
    expect(fixture.nativeElement.querySelectorAll('button, input, select, textarea')).toHaveLength(0);
  });

  it('does not open the month automatically', () => {
    expect(TestBed.inject(BudgetService).isMonthOpened(TEST_MONTH)).toBe(false);
  });

  describe('without planned lines', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('renders zero income and expenses without sign', () => {
      const values = metricValues();
      expect(values).toEqual([expected(0), expected(0), expected(0)]);
      expect(values.some(value => value.includes(MINUS_SIGN))).toBe(false);
      expect(values.some(value => value.startsWith('+'))).toBe(false);
    });
  });

  describe('with planned lines', () => {
    beforeEach(() => {
      const budget = TestBed.inject(BudgetService);
      budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('income'), 3000);
      budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 1000);
      fixture.detectChanges();
    });

    it('renders income, expenses and unallocated amounts through MoneyPipe', () => {
      expect(metricValues()).toEqual([
        expected(300000, 'income'),
        expected(100000, 'expense'),
        expected(200000),
      ]);
    });

    it('shows a plus sign on income and a minus sign on expenses', () => {
      const values = metricValues();
      expect(values[0].startsWith('+')).toBe(true);
      expect(values[1].startsWith(MINUS_SIGN)).toBe(true);
    });

    it('shows no sign on a positive unallocated amount', () => {
      const unallocated = metricValues()[2];
      expect(unallocated.startsWith('+')).toBe(false);
      expect(unallocated.startsWith(MINUS_SIGN)).toBe(false);
    });

    it('drops the expense sign when planned expenses are reset to zero', () => {
      TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 0);
      fixture.detectChanges();

      const values = metricValues();
      expect(values).toEqual([
        expected(300000, 'income'),
        expected(0),
        expected(300000),
      ]);
      expect(values[0].startsWith('+')).toBe(true);
      expect(values[1].startsWith(MINUS_SIGN)).toBe(false);
    });

    it('keeps the minus sign and the real value on a negative unallocated amount', () => {
      TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 5000);
      fixture.detectChanges();

      const unallocated = metricValues()[2];
      expect(unallocated).toBe(expected(-200000));
      expect(unallocated.startsWith(MINUS_SIGN)).toBe(true);
      expect(unallocated).not.toBe(expected(0));
    });

    it('reflects a change of currency and locale from SettingsService', () => {
      TestBed.inject(SettingsService).updateSettings({ currency: 'USD', locale: 'en-US' });
      fixture.detectChanges();

      const values = metricValues();
      expect(values).toEqual([
        expected(300000, 'income'),
        expected(100000, 'expense'),
        expected(200000),
      ]);
      expect(values.every(value => value.includes('$'))).toBe(true);
    });
  });

  describe('translations', () => {
    it('renders the French labels by default', () => {
      expect(metricLabels()).toEqual(['Revenus prévus', 'Dépenses prévues', 'Montant non alloué']);
    });

    it('renders the English labels after switching language', () => {
      TestBed.inject(TranslocoService).setActiveLang('en');
      fixture.detectChanges();

      const section: HTMLElement | null = fixture.nativeElement.querySelector('section');
      expect(section?.getAttribute('aria-label')).toBe('Monthly allocation');
      expect(metricLabels()).toEqual(['Planned income', 'Planned expenses', 'Unallocated amount']);
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
    });

    describe('desktop', () => {
      beforeEach(() => {
        const budget = TestBed.inject(BudgetService);
        budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('income'), 3000);
        budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 1000);
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

      it('uses the balanced layout below the desktop breakpoint', () => {
        renderWith({ desktop: false, width: categoryCount() * 256 });
        expect(elementOf('.columns')).toBeNull();
        expect(elementOf('.balanced')).not.toBeNull();
      });
    });

    describe('mobile', () => {
      beforeEach(() => {
        const budget = TestBed.inject(BudgetService);
        budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('income'), 3000);
        budget.setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 1000);
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

      it('formats card totals and line amounts through MoneyPipe with the sign rule', () => {
        const card = cardOf(categoryIdOf('expense'));
        expect(textsOf(card, '.total-value')).toEqual([
          expected(100000, 'expense'),
          expected(85000, 'expense'),
        ]);
        const line = lineOf(subcategoryNameOf(subcategoryIdOf('expense')));
        expect(textsOf(line, '.amount-value')).toEqual([
          expected(100000, 'expense'),
          expected(85000, 'expense'),
        ]);
      });

      it('updates card totals when a planned amount changes', () => {
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 2000);
        fixture.detectChanges();
        expect(textsOf(cardOf(categoryIdOf('expense')), '.total-value')[0]).toBe(
          expected(200000, 'expense'),
        );
      });

      it('renders the English table labels after switching language', () => {
        TestBed.inject(TranslocoService).setActiveLang('en');
        fixture.detectChanges();
        expect(elementOf('section.table-section')?.getAttribute('aria-label')).toBe('Category tracking');
        expect(elementOf('.shortcuts-nav')?.getAttribute('aria-label')).toBe('Quick access to categories');
        expect(textsOf(elementOf('.card-totals'), '.total-label')[0]).toBe('Planned');
      });
    });

    describe('line progress', () => {
      beforeEach(() => {
        // Mock data already spends 850 € on this subcategory this month.
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 1000);
      });

      function addActual(amountEuros: number): void {
        TestBed.inject(TransactionService).add({
          label: 'Test',
          categoryId: categoryIdOf('expense'),
          subcategoryId: subcategoryIdOf('expense'),
          date: `${TEST_MONTH}-15`,
          amountEuros,
          type: 'expense',
        });
      }

      function expenseLine(): HTMLElement | undefined {
        return lineOf(subcategoryNameOf(subcategoryIdOf('expense')));
      }

      it('reports under-consumption below 80 percent of the planned amount', () => {
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 1700);
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
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 500);
        renderMobile();
        const line = expenseLine();
        const bar = line?.querySelector('[role="progressbar"]');
        expect(bar?.getAttribute('aria-valuenow')).toBe('100');
        expect(bar?.getAttribute('aria-valuetext')).toBe(
          `Réel ${expected(85000)} sur ${expected(50000)} prévus`,
        );
        expect(line?.querySelector('.fill')?.classList.contains('over')).toBe(true);
      });

      it('shows the real-without-planned note instead of a progress bar', () => {
        TestBed.inject(BudgetService).setPlannedAmount(TEST_MONTH, subcategoryIdOf('expense'), 0);
        addActual(50);
        renderMobile();
        const line = expenseLine();
        expect(textsOf(line, 'p.note')).toEqual(['Réel sans prévu']);
        expect(line?.querySelector('[role="progressbar"]')).toBeNull();
      });
    });
  });
});

