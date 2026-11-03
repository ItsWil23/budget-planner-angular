import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { MoneyPipe } from '../../components/ui/money-pipe/money-pipe';
import { CategoryType } from '../../models/category';
import { BudgetService } from '../../services/budget';
import { CategoryService } from '../../services/category';
import { MoneyService } from '../../services/money';
import { MonthContextService } from '../../services/month-context';
import { SettingsService } from '../../services/settings';
import { BudgetMensuel } from './budget-mensuel';

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
});

