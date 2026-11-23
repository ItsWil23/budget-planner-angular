import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { TransactionList, splitAmountGroups } from './transaction-list';
import { SettingsService } from '../../../services/settings';
import { Category, Subcategory } from '../../../models/category';
import { TransactionPresentation } from '../../../models/transactions';

registerLocaleData(localeFr);

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
                actions: 'Actions pour {{name}}',
                edit: 'Modifier',
                delete: 'Supprimer',
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
      'tbody td[colspan="6"]',
    );
    expect(emptyCell?.textContent?.trim()).toBe('Aucune transaction pour le moment.');
  });

  describe('menu de ligne', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('categories', TEST_CATEGORIES);
      fixture.componentRef.setInput('subcategories', TEST_SUBCATEGORIES);
      fixture.componentRef.setInput('transactions', TEST_TRANSACTIONS);
      fixture.detectChanges();
    });

    function openMenu(id: string): void {
      const trigger: HTMLButtonElement | null = fixture.nativeElement.querySelector(
        `[data-action="row-actions-${id}"]`,
      );
      trigger?.click();
      fixture.detectChanges();
    }

    function editItem(id: string): HTMLButtonElement | null {
      return fixture.nativeElement.querySelector(`[data-action="edit-${id}"]`);
    }

    it('affiche un menu par ligne avec l’entrée Modifier', () => {
      expect(fixture.nativeElement.querySelectorAll('app-row-menu')).toHaveLength(2);
      openMenu('tx-income');
      expect(editItem('tx-income')?.textContent?.trim()).toBe('Modifier');
    });

    it('émet la transaction éditée au clic sur Modifier', () => {
      const emitted: TransactionPresentation[] = [];
      component.editTransaction.subscribe((transaction: TransactionPresentation) =>
        emitted.push(transaction),
      );

      openMenu('tx-expense');
      editItem('tx-expense')?.click();

      expect(emitted).toEqual([TEST_TRANSACTIONS[1]]);
    });

    it('émet l’identifiant de la ligne au clic sur Supprimer', () => {
      const emitted: string[] = [];
      component.deleteTransaction.subscribe((id: string) => emitted.push(id));

      openMenu('tx-expense');
      const deleteItem: HTMLButtonElement | null = fixture.nativeElement.querySelector(
        '[data-action="delete-tx-expense"]',
      );
      expect(deleteItem?.textContent?.trim()).toBe('Supprimer');
      deleteItem?.click();

      expect(emitted).toEqual(['tx-expense']);
    });

    it('n’affiche aucun menu quand la liste est en lecture seule', () => {
      fixture.componentRef.setInput('readOnly', true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-row-menu')).toBeNull();
    });
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

    it('should split the maximum formatted amount at group separators only', () => {
      const parts: string[] = splitAmountGroups(
        '\u221290\u202f071\u202f992\u202f547\u202f409,91\u00a0€',
      );

      expect(parts).toEqual([
        '\u221290\u202f',
        '071\u202f',
        '992\u202f',
        '547\u202f',
        '409,91\u00a0€',
      ]);
    });

    it('should split an en-US maximum amount after commas and keep the cents intact', () => {
      expect(splitAmountGroups('\u2212$90,071,992,547,409.91')).toEqual([
        '\u2212$90,',
        '071,',
        '992,',
        '547,',
        '409.91',
      ]);
    });

    it('should keep a short amount in a single part', () => {
      expect(splitAmountGroups('+39,99\u00a0€')).toEqual(['+39,99\u00a0€']);
    });

    it('should render the maximum amount in groups without altering its text', () => {
      fixture.componentRef.setInput('transactions', [
        {
          ...TEST_TRANSACTIONS[1],
          amountCents: Number.MAX_SAFE_INTEGER,
          amountEuros: Number.MAX_SAFE_INTEGER / 100,
        },
      ]);
      fixture.detectChanges();

      const cell: HTMLTableCellElement = fixture.nativeElement.querySelector('td.amount-cell');
      const groups: string[] = Array.from(
        cell.querySelectorAll('.amount-group'),
        (group: Element) => group.textContent ?? '',
      );

      expect(groups.length).toBeGreaterThan(1);
      expect(groups.join('')).toBe(cell.textContent?.trim());
      expect(groups.join('')).toBe('\u221290\u202f071\u202f992\u202f547\u202f409,91\u00a0€');
    });
  });

  describe('date display', () => {
    function dateCells(): HTMLTimeElement[] {
      return Array.from(fixture.nativeElement.querySelectorAll('td.date-cell time'));
    }

    beforeEach(() => {
      fixture.componentRef.setInput('categories', TEST_CATEGORIES);
      fixture.componentRef.setInput('subcategories', TEST_SUBCATEGORIES);
      fixture.componentRef.setInput('transactions', TEST_TRANSACTIONS);
      fixture.detectChanges();
    });

    it('exposes the ISO date in a time element without shifting the day', () => {
      expect(dateCells()[0].getAttribute('datetime')).toBe('2026-10-01');
      expect(dateCells()[0].textContent?.trim()).toBe('1 oct. 2026');
    });

    it('follows the locale from SettingsService', () => {
      TestBed.inject(SettingsService).updateSettings({ currency: 'USD', locale: 'en-US' });
      fixture.detectChanges();

      expect(dateCells()[0].textContent?.trim()).toBe('Oct 1, 2026');
    });
  });

  describe('dépliage mobile', () => {
    function toggleFor(id: string): HTMLButtonElement {
      return fixture.nativeElement.querySelector(
        `button[aria-controls="transaction-details-${id}"]`,
      );
    }

    function rowFor(id: string): HTMLElement {
      return toggleFor(id).closest('tr') as HTMLElement;
    }

    beforeEach(() => {
      fixture.componentRef.setInput('categories', TEST_CATEGORIES);
      fixture.componentRef.setInput('subcategories', TEST_SUBCATEGORIES);
      fixture.componentRef.setInput('transactions', TEST_TRANSACTIONS);
      fixture.detectChanges();
    });

    it('bascule aria-expanded et affiche la catégorie au dépliage', () => {
      const toggle: HTMLButtonElement = toggleFor('tx-income');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(rowFor('tx-income').querySelector('.detail-category')).toBeNull();

      toggle.click();
      fixture.detectChanges();

      expect(toggleFor('tx-income').getAttribute('aria-expanded')).toBe('true');
      expect(
        rowFor('tx-income').querySelector('.detail-category')?.textContent?.trim(),
      ).toBe('Revenus');
    });

    it('n’ouvre qu’une ligne à la fois', () => {
      toggleFor('tx-income').click();
      fixture.detectChanges();
      toggleFor('tx-expense').click();
      fixture.detectChanges();

      expect(toggleFor('tx-income').getAttribute('aria-expanded')).toBe('false');
      expect(toggleFor('tx-expense').getAttribute('aria-expanded')).toBe('true');
    });

    it('referme la ligne ouverte quand on la clique à nouveau', () => {
      toggleFor('tx-income').click();
      fixture.detectChanges();
      toggleFor('tx-income').click();
      fixture.detectChanges();

      expect(toggleFor('tx-income').getAttribute('aria-expanded')).toBe('false');
    });

    it('ne laisse aucun détail ouvert quand la transaction disparaît', () => {
      toggleFor('tx-income').click();
      fixture.detectChanges();

      fixture.componentRef.setInput('transactions', [TEST_TRANSACTIONS[1]]);
      fixture.detectChanges();
      fixture.componentRef.setInput('transactions', TEST_TRANSACTIONS);
      fixture.detectChanges();

      expect(toggleFor('tx-income').getAttribute('aria-expanded')).toBe('false');
    });

    it('nomme le déclencheur par le libellé de la transaction', () => {
      const labelledBy: string | null = toggleFor('tx-income').getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(document.getElementById(labelledBy as string)?.textContent?.trim()).toBe(
        TEST_TRANSACTIONS[0].label,
      );
    });

    it('ne déplie pas la ligne au clic sur le menu', () => {
      const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-action="row-actions-tx-income"]',
      );
      trigger.click();
      fixture.detectChanges();

      expect(toggleFor('tx-income').getAttribute('aria-expanded')).toBe('false');
    });

    it('ne déplie pas la ligne au clic sur Modifier ou Supprimer', () => {
      const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-action="row-actions-tx-income"]',
      );
      trigger.click();
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('[data-action="edit-tx-income"]') as HTMLElement).click();
      fixture.detectChanges();

      expect(toggleFor('tx-income').getAttribute('aria-expanded')).toBe('false');

      trigger.click();
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('[data-action="delete-tx-income"]') as HTMLElement).click();
      fixture.detectChanges();

      expect(toggleFor('tx-income').getAttribute('aria-expanded')).toBe('false');
    });

    it('place un chevron centré sur toute la ligne et le retourne au dépliage', () => {
      const chevron: SVGElement | null = rowFor('tx-income').querySelector('.label-body > .chevron');
      expect(chevron).not.toBeNull();
      expect(rowFor('tx-income').classList).not.toContain('expanded');

      toggleFor('tx-income').click();
      fixture.detectChanges();

      expect(rowFor('tx-income').classList).toContain('expanded');
      expect(rowFor('tx-income').querySelector('.label-body > .chevron')).not.toBeNull();
    });

    it('reste disponible en lecture seule, sans menu', () => {
      fixture.componentRef.setInput('readOnly', true);
      fixture.detectChanges();

      toggleFor('tx-expense').click();
      fixture.detectChanges();

      expect(toggleFor('tx-expense').getAttribute('aria-expanded')).toBe('true');
      expect(fixture.nativeElement.querySelector('app-row-menu')).toBeNull();
    });
  });
});
