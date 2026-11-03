import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { TransactionList } from './transaction-list';
import { SettingsService } from '../../../services/settings';
import { Category, Subcategory } from '../../../models/category';
import { TransactionPresentation } from '../../../models/transactions';

const TEST_CATEGORIES: Category[] = [
  { id: 'cat-income', name: 'Revenus', type: 'income', color: 'teal' },
  { id: 'cat-housing', name: 'Logement', type: 'expense', color: 'orange' },
];

const TEST_SUBCATEGORIES: Subcategory[] = [
  { id: 'sub-salary', name: 'Salaire', categoryId: 'cat-income', icon: '💼' },
  { id: 'sub-rent', name: 'Loyer', categoryId: 'cat-housing', icon: '🏠' },
];

const TEST_TRANSACTIONS: TransactionPresentation[] = [
  {
    id: 'tx-income',
    label: 'Salaire octobre',
    categoryId: 'cat-income',
    subcategoryId: 'sub-salary',
    date: '2026-10-01',
    monthKey: '2026-10',
    amountCents: 3999,
    amountEuros: 39.99,
    type: 'income',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'tx-expense',
    label: 'Loyer octobre',
    categoryId: 'cat-housing',
    subcategoryId: 'sub-rent',
    date: '2026-10-02',
    monthKey: '2026-10',
    amountCents: 1250,
    amountEuros: 12.5,
    type: 'expense',
    createdAt: '2026-10-02T08:00:00.000Z',
  },
];

describe('TransactionList', () => {
  let component: TransactionList;
  let fixture: ComponentFixture<TransactionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TransactionList,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              transactionList: {
                headers: { label: 'Libellé' },
                empty: 'Aucune transaction pour le moment.',
              },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the French label header', () => {
    fixture.detectChanges();
    const headers: NodeListOf<HTMLTableCellElement> = fixture.nativeElement.querySelectorAll('th');
    expect(headers[0].textContent?.trim()).toBe('Libellé');
  });

  it('should render the empty state message in a full-width row', () => {
    fixture.detectChanges();
    const emptyCell: HTMLTableCellElement | null = fixture.nativeElement.querySelector(
      'tbody td[colspan="5"]',
    );
    expect(emptyCell?.textContent?.trim()).toBe('Aucune transaction pour le moment.');
  });

  describe('money formatting', () => {
    function amountCells(): string[] {
      const cells: NodeListOf<HTMLTableCellElement> =
        fixture.nativeElement.querySelectorAll('td.amount-cell');
      return Array.from(cells, (cell: HTMLTableCellElement) => cell.textContent?.trim() ?? '');
    }

    beforeEach(() => {
      fixture.componentRef.setInput('categories', TEST_CATEGORIES);
      fixture.componentRef.setInput('subcategories', TEST_SUBCATEGORIES);
      fixture.componentRef.setInput('transactions', TEST_TRANSACTIONS);
      fixture.detectChanges();
    });

    it('should show a plus sign on the income amount in EUR', () => {
      expect(amountCells()[0]).toBe('+39,99\u00a0€');
    });

    it('should show a typographic minus sign on the expense amount in EUR', () => {
      expect(amountCells()[1]).toBe('\u221212,50\u00a0€');
    });

    it('should reflect a change of currency and locale from SettingsService', () => {
      TestBed.inject(SettingsService).updateSettings({ currency: 'USD', locale: 'en-US' });
      fixture.detectChanges();

      expect(amountCells()).toEqual(['+$39.99', '\u2212$12.50']);
    });
  });
});
