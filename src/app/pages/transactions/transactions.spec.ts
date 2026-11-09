import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import localeFr from '@angular/common/locales/fr';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localeFr);

import { vi } from 'vitest';
import { Transactions } from './transactions';
import { TransactionService } from '../../services/transaction';
import { BudgetService, TransactionAggregateOverflowError } from '../../services/budget';
import { TransactionInput } from '../../models/transactions';

describe('Transactions', () => {
  let component: Transactions;
  let fixture: ComponentFixture<Transactions>;
  let transactionService: TransactionService;
  let budgetService: BudgetService;

  const incomeInput: TransactionInput = {
    label: 'Salaire test',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1',
    type: 'income',
    date: '2026-10-09',
    amountCents: 100,
  };

  function transactionCount(): number {
    return transactionService.presentationTransactions().length;
  }

  function formElement(): HTMLElement | null {
    return fixture.nativeElement.querySelector('app-transaction-form');
  }

  function aggregateAlert(): HTMLElement | null {
    return fixture.nativeElement.querySelector('#transactionAggregateError');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Transactions,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              transactions: { title: 'Transactions' },
              transactionForm: {
                submit: 'Ajouter',
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
      providers: [provideRouter([])],
    }).compileComponents();

    transactionService = TestBed.inject(TransactionService);
    budgetService = TestBed.inject(BudgetService);
    fixture = TestBed.createComponent(Transactions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('garde de précontrôle agrégé', () => {
    it('reste en modale sans mutation et affiche l’erreur quand le précontrôle échoue', () => {
      const addSpy = vi.spyOn(transactionService, 'add');
      vi.spyOn(budgetService, 'assertTransactionAddable').mockImplementation(() => {
        throw new TransactionAggregateOverflowError();
      });
      const countBefore = transactionCount();

      component.openModal();
      fixture.detectChanges();
      component.onTransactionSubmit(incomeInput);
      fixture.detectChanges();

      expect(addSpy).not.toHaveBeenCalled();
      expect(transactionCount()).toBe(countBefore);
      expect(formElement()).not.toBeNull();
      expect(aggregateAlert()?.textContent?.trim()).toBe('AGGREGATE OVERFLOW');
    });

    it('conserve le brouillon saisi après un rejet agrégé', () => {
      vi.spyOn(budgetService, 'assertTransactionAddable').mockImplementation(() => {
        throw new TransactionAggregateOverflowError();
      });

      component.openModal();
      fixture.detectChanges();
      const labelInput: HTMLInputElement = fixture.nativeElement.querySelector('#transactionLabel');
      labelInput.value = 'Brouillon conservé';
      labelInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      const draftBeforeSubmit = labelInput.value;

      component.onTransactionSubmit(incomeInput);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#transactionLabel').value).toBe(draftBeforeSubmit);
      expect(formElement()).not.toBeNull();
    });

    it('efface l’erreur agrégée dès que le brouillon est modifié', () => {
      vi.spyOn(budgetService, 'assertTransactionAddable').mockImplementation(() => {
        throw new TransactionAggregateOverflowError();
      });

      component.openModal();
      fixture.detectChanges();
      component.onTransactionSubmit(incomeInput);
      fixture.detectChanges();
      expect(aggregateAlert()).not.toBeNull();

      const labelInput: HTMLInputElement = fixture.nativeElement.querySelector('#transactionLabel');
      labelInput.value = 'Modifié';
      labelInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(aggregateAlert()).toBeNull();
    });

    it('relance les erreurs qui ne sont pas un dépassement agrégé', () => {
      const addSpy = vi.spyOn(transactionService, 'add');
      vi.spyOn(budgetService, 'assertTransactionAddable').mockImplementation(() => {
        throw new Error('erreur inattendue');
      });

      component.openModal();
      expect(() => component.onTransactionSubmit(incomeInput)).toThrow('erreur inattendue');
      expect(addSpy).not.toHaveBeenCalled();
    });

    it('ajoute la transaction et ferme la modale en cas de succès', () => {
      const addSpy = vi.spyOn(transactionService, 'add');
      const countBefore = transactionCount();

      component.openModal();
      fixture.detectChanges();
      component.onTransactionSubmit(incomeInput);
      fixture.detectChanges();

      expect(addSpy).toHaveBeenCalledWith(incomeInput);
      expect(transactionCount()).toBe(countBefore + 1);
      expect(formElement()).toBeNull();
    });

    it('refuse réellement un revenu qui fait dépasser la somme des revenus du mois', () => {
      const addSpy = vi.spyOn(transactionService, 'add');
      const countBefore = transactionCount();
      const overflowInput: TransactionInput = {
        ...incomeInput,
        date: '2026-10-09',
        amountCents: Number.MAX_SAFE_INTEGER,
      };

      component.openModal();
      fixture.detectChanges();
      component.onTransactionSubmit(overflowInput);
      fixture.detectChanges();

      expect(addSpy).not.toHaveBeenCalled();
      expect(transactionCount()).toBe(countBefore);
      expect(formElement()).not.toBeNull();
      expect(aggregateAlert()?.textContent?.trim()).toBe('AGGREGATE OVERFLOW');
    });
  });
});
