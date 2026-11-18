import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { Category, Subcategory } from '../../../models/category';
import type { Transaction, TransactionInput } from '../../../models/transactions';
import { vi } from 'vitest';

import { TransactionForm } from './transaction-form';

describe('TransactionForm', () => {
  let component: TransactionForm;
  let fixture: ComponentFixture<TransactionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TransactionForm,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              transactionForm: {
                submit: 'Ajouter',
                save: 'Enregistrer',
                cancel: 'Annuler',
                amountInvalid: 'INVALID AMOUNT',
                amountTooLarge: 'TOO LARGE',
                aggregateOverflow: 'AGGREGATE OVERFLOW',
              },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pré-remplit la date avec la date locale du jour, même tôt le matin', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 18, 0, 30));

    const localFixture = TestBed.createComponent(TransactionForm);

    expect(localFixture.componentInstance.newTransactionForm.controls.date.value).toBe('2026-11-18');
  });

  describe('mode édition', () => {
    const categories: Category[] = [
      { id: 'cat-1', name: 'Alimentation', type: 'expense', color: '#000000' },
      { id: 'cat-2', name: 'Logement', type: 'expense', color: '#111111' },
    ];
    const subcategories: Subcategory[] = [
      { id: 'sub-1', name: 'Courses', categoryId: 'cat-1', icon: 'basket' },
      { id: 'sub-2', name: 'Loyer', categoryId: 'cat-2', icon: 'home' },
      { id: 'sub-3', name: 'Charges', categoryId: 'cat-2', icon: 'bolt' },
    ];

    function editableTransaction(overrides: Partial<Transaction>): Transaction {
      return {
        id: 'tx-1',
        label: 'Loyer octobre',
        categoryId: 'cat-2',
        subcategoryId: 'sub-2',
        date: '2026-10-09',
        monthKey: '2026-10',
        amountCents: 123405,
        type: 'expense',
        createdAt: '2026-10-01T08:00:00.000Z',
        ...overrides,
      };
    }

    function createEditForm(transaction: Transaction): ComponentFixture<TransactionForm> {
      const editFixture = TestBed.createComponent(TransactionForm);
      editFixture.componentRef.setInput('formCategories', categories);
      editFixture.componentRef.setInput('formSubcategories', subcategories);
      editFixture.componentRef.setInput('transaction', transaction);
      editFixture.detectChanges();
      return editFixture;
    }

    it('pré-remplit libellé, catégorie, sous-catégorie et date', () => {
      const editFixture = createEditForm(editableTransaction({}));
      const controls = editFixture.componentInstance.newTransactionForm.controls;

      expect(controls.label.value).toBe('Loyer octobre');
      expect(controls.categoryId.value).toBe('cat-2');
      expect(controls.subcategoryId.value).toBe('sub-2');
      expect(controls.date.value).toBe('2026-10-09');
    });

    it.each([
      [123405, '1234,05'],
      [1, '0,01'],
    ])('pré-remplit le montant de %i centimes en « %s »', (amountCents: number, expectedText: string) => {
      const editFixture = createEditForm(editableTransaction({ amountCents }));

      expect(editFixture.componentInstance.newTransactionForm.controls.amountText.value).toBe(expectedText);
    });

    it('affiche le libellé Enregistrer sur le bouton en édition', () => {
      const editFixture = createEditForm(editableTransaction({}));

      expect(editFixture.nativeElement.querySelector('button[type="submit"]').textContent.trim()).toBe(
        'Enregistrer',
      );
    });

    it('réinitialise la sous-catégorie au changement de catégorie puis accepte une nouvelle sous-catégorie', () => {
      const editFixture = createEditForm(editableTransaction({}));
      const form = editFixture.componentInstance.newTransactionForm;

      form.controls.categoryId.setValue('cat-1');
      expect(form.controls.subcategoryId.value).toBe('');

      form.controls.categoryId.setValue('cat-2');
      form.controls.subcategoryId.setValue('sub-3');
      expect(form.controls.subcategoryId.value).toBe('sub-3');
    });
  });

  describe('montant en centimes exacts', () => {
    let emittedTransactions: TransactionInput[];

    const categories: Category[] = [
      { id: 'cat-1', name: 'Alimentation', type: 'expense', color: '#000000' },
    ];
    const subcategories: Subcategory[] = [
      { id: 'sub-1', name: 'Courses', categoryId: 'cat-1', icon: 'basket' },
    ];

    beforeEach(() => {
      emittedTransactions = [];
      component.transactionSubmit.subscribe((transaction: TransactionInput) =>
        emittedTransactions.push(transaction),
      );
      fixture.componentRef.setInput('formCategories', categories);
      fixture.componentRef.setInput('formSubcategories', subcategories);
      fixture.detectChanges();
    });

    function fillDraft(amountText: string): void {
      component.newTransactionForm.controls.categoryId.setValue('cat-1');
      component.newTransactionForm.controls.subcategoryId.setValue('sub-1');
      component.newTransactionForm.controls.label.setValue('Courses');
      component.newTransactionForm.controls.date.setValue('2026-10-09');
      component.newTransactionForm.controls.amountText.setValue(amountText);
      fixture.detectChanges();
    }

    function submit(): void {
      fixture.nativeElement.querySelector('form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
    }

    function alertText(id: string): string | null {
      return fixture.nativeElement.querySelector(`#${id}`)?.textContent?.trim() ?? null;
    }

    it.each([
      ['1,23', 123],
      ['1.23', 123],
      ['12,5', 1250],
      ['0.01', 1],
      ['90071992547409.91', Number.MAX_SAFE_INTEGER],
    ])('émet %s sous forme de %i centimes exacts', (amountText: string, expectedCents: number) => {
      fillDraft(amountText);
      submit();

      expect(emittedTransactions).toHaveLength(1);
      expect(emittedTransactions[0].amountCents).toBe(expectedCents);
      expect(emittedTransactions[0]).not.toHaveProperty('amountEuros');
      expect(emittedTransactions[0]).toEqual(
        expect.objectContaining({ categoryId: 'cat-1', subcategoryId: 'sub-1' }),
      );
      expect(emittedTransactions[0]).not.toHaveProperty('type');
    });

    it.each(['', '   ', '0', '0,00', '-0', '-12,50', '.5', '1,234', 'abc', '1 000', '1e3'])(
      'refuse %j sans émettre et conserve le brouillon',
      (amountText: string) => {
        fillDraft(amountText);
        submit();

        expect(emittedTransactions).toHaveLength(0);
        expect(component.newTransactionForm.controls.amountText.value).toBe(amountText);
        expect(component.newTransactionForm.controls.label.value).toBe('Courses');
        expect(alertText('transactionAmountError')).toBe('INVALID AMOUNT');
      },
    );

    it('refuse un montant au-delà de la plage sûre avec le message dédié', () => {
      fillDraft('90071992547409.92');
      submit();

      expect(emittedTransactions).toHaveLength(0);
      expect(alertText('transactionAmountError')).toBe('TOO LARGE');
    });

    it('ne réinitialise pas le brouillon après une saisie valide', () => {
      fillDraft('1,23');
      submit();

      expect(emittedTransactions).toHaveLength(1);
      expect(component.newTransactionForm.controls.amountText.value).toBe('1,23');
      expect(component.newTransactionForm.controls.label.value).toBe('Courses');
    });

    it('expose le montant invalide à l’aide d’aria-invalid et aria-describedby', () => {
      fillDraft('0');
      submit();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('#transactionAmount');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('transactionAmountError');
      expect(input.getAttribute('inputmode')).toBe('decimal');
      expect(input.getAttribute('type')).toBe('text');
    });

    it('efface le message d’erreur dès que le montant est modifié', () => {
      fillDraft('0');
      submit();
      expect(alertText('transactionAmountError')).toBe('INVALID AMOUNT');

      component.newTransactionForm.controls.amountText.setValue('1');
      fixture.detectChanges();

      expect(alertText('transactionAmountError')).toBeNull();
      expect(fixture.nativeElement.querySelector('#transactionAmount').getAttribute('aria-invalid')).toBeNull();
    });

    it('émet draftChange à chaque modification du brouillon', () => {
      let draftChanges = 0;
      component.draftChange.subscribe(() => draftChanges++);

      component.newTransactionForm.controls.label.setValue('Courses');

      expect(draftChanges).toBeGreaterThan(0);
    });

    it('affiche le message de dépassement agrégé uniquement quand l’entrée est active', () => {
      expect(alertText('transactionAggregateError')).toBeNull();

      fixture.componentRef.setInput('aggregateOverflow', true);
      fixture.detectChanges();

      expect(alertText('transactionAggregateError')).toBe('AGGREGATE OVERFLOW');
    });
  });
});
