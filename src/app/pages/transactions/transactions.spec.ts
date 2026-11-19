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
import { MonthContextService } from '../../services/month-context';
import { TransactionInput, TransactionPresentation } from '../../models/transactions';
import { MOCK_TRANSACTIONS } from '../../mocks/mock-transactions';

describe('Transactions', () => {
  let component: Transactions;
  let fixture: ComponentFixture<Transactions>;
  let transactionService: TransactionService;
  let budgetService: BudgetService;

  const incomeInput: TransactionInput = {
    label: 'Salaire test',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1',
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
              transactions: {
                title: 'Transactions',
                deleteTitle: 'DELETE TITLE',
                deleteMessage: 'DELETE {{label}}?',
                deleteConfirm: 'CONFIRM DELETE',
                deleteCancel: 'CANCEL DELETE',
                deleted: 'Transaction « {{label}} » supprimée.',
                undo: 'UNDO',
                deleteRefused: 'DELETE REFUSED',
              },
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

  describe('modification d’une transaction', () => {
    let monthContext: MonthContextService;
    let original: TransactionPresentation;

    function editInput(overrides: Partial<TransactionInput> = {}): TransactionInput {
      return {
        label: original.label,
        categoryId: original.categoryId,
        subcategoryId: original.subcategoryId,
        date: original.date,
        amountCents: original.amountCents,
        ...overrides,
      };
    }

    function listed(id: string): TransactionPresentation | undefined {
      return transactionService.presentationTransactions().find(transaction => transaction.id === id);
    }

    beforeEach(() => {
      monthContext = TestBed.inject(MonthContextService);
      monthContext.setMonth('2026-10');
      original = component['transactions']()[0];
      expect(original).toBeDefined();
    });

    it('ouvre la modale pré-remplie avec la transaction', () => {
      component.openEdit(original.id);
      fixture.detectChanges();

      const labelInput: HTMLInputElement = fixture.nativeElement.querySelector('#transactionLabel');
      expect(labelInput.value).toBe(original.label);
      expect(formElement()).not.toBeNull();
    });

    it('enregistre la modification en conservant id et date de création', () => {
      const updateSpy = vi.spyOn(transactionService, 'update');

      component.openEdit(original.id);
      fixture.detectChanges();
      component.onTransactionSubmit(editInput({ label: 'Libellé modifié', amountCents: 999 }));
      fixture.detectChanges();

      expect(updateSpy).toHaveBeenCalledWith(
        original.id,
        editInput({ label: 'Libellé modifié', amountCents: 999 }),
      );
      expect(listed(original.id)).toEqual(
        expect.objectContaining({
          id: original.id,
          label: 'Libellé modifié',
          amountCents: 999,
          createdAt: original.createdAt,
        }),
      );
      expect(formElement()).toBeNull();
    });

    it('reste en modale sans mutation quand la modification dépasserait les totaux', () => {
      const updateSpy = vi.spyOn(transactionService, 'update');
      vi.spyOn(budgetService, 'assertTransactionUpdatable').mockImplementation(() => {
        throw new TransactionAggregateOverflowError();
      });
      const before = JSON.stringify(transactionService.presentationTransactions());

      component.openEdit(original.id);
      fixture.detectChanges();
      component.onTransactionSubmit(editInput({ label: 'Refusé' }));
      fixture.detectChanges();

      expect(updateSpy).not.toHaveBeenCalled();
      expect(JSON.stringify(transactionService.presentationTransactions())).toBe(before);
      expect(formElement()).not.toBeNull();
      expect(aggregateAlert()?.textContent?.trim()).toBe('AGGREGATE OVERFLOW');
    });

    it('ferme la modale sans rien modifier à l’annulation', () => {
      const updateSpy = vi.spyOn(transactionService, 'update');
      const before = JSON.stringify(transactionService.presentationTransactions());

      component.openEdit(original.id);
      fixture.detectChanges();
      component.onTransactionCancel();
      fixture.detectChanges();

      expect(updateSpy).not.toHaveBeenCalled();
      expect(JSON.stringify(transactionService.presentationTransactions())).toBe(before);
      expect(formElement()).toBeNull();
    });

    it('bascule sur le mois de la transaction modifiée et l’affiche', () => {
      component.openEdit(original.id);
      component.onTransactionSubmit(editInput({ date: '2026-11-05' }));
      fixture.detectChanges();

      expect(monthContext.monthKey()).toBe('2026-11');
      expect(listed(original.id)?.monthKey).toBe('2026-11');
      expect(visibleTransactionIds()).toContain(original.id);
    });

    it('rend le focus au déclencheur du menu de la ligne après fermeture', async () => {
      component.openEdit(original.id);
      fixture.detectChanges();
      component.onTransactionCancel();
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger: HTMLElement | null = fixture.nativeElement.querySelector(
        `[data-menu-trigger="${original.id}"]`,
      );
      expect(document.activeElement).toBe(trigger);
    });

    function visibleTransactionIds(): string[] {
      return component['transactions']().map(transaction => transaction.id);
    }
  });

  describe('suppression et annulation', () => {
    let target: TransactionPresentation;
    let visible: TransactionPresentation[];

    function presentedJson(): string {
      return JSON.stringify(transactionService.presentationTransactions());
    }

    function presentedIds(): string[] {
      return transactionService.presentationTransactions().map(transaction => transaction.id);
    }

    function confirmButton(): HTMLButtonElement | null {
      return fixture.nativeElement.querySelector('[data-action="confirm-delete"]');
    }

    function undoButton(): HTMLButtonElement | null {
      return fixture.nativeElement.querySelector('[data-action="undo-toast-action"]');
    }

    function toastText(): string | undefined {
      return fixture.nativeElement.querySelector('app-undo-toast .message')?.textContent?.trim();
    }

    function modalOpen(): boolean {
      return confirmButton() !== null;
    }

    function startDelete(id: string): void {
      component.onTransactionDelete(id);
      fixture.detectChanges();
    }

    function deleteAndConfirm(id: string): void {
      startDelete(id);
      confirmButton()?.click();
      fixture.detectChanges();
    }

    beforeEach(() => {
      visible = component['transactions']();
      target = visible[1];
      expect(target).toBeDefined();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('ferme la confirmation sans rien modifier à l’annulation ou à Échap', () => {
      const removeSpy = vi.spyOn(transactionService, 'remove');
      const before = presentedJson();

      startDelete(target.id);
      expect(modalOpen()).toBe(true);
      confirmButton()?.closest('app-modal')?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      fixture.detectChanges();

      expect(modalOpen()).toBe(false);
      expect(removeSpy).not.toHaveBeenCalled();
      expect(presentedJson()).toBe(before);
      expect(undoButton()).toBeNull();
    });

    it('supprime la transaction à la confirmation et affiche la notification avec annulation', () => {
      deleteAndConfirm(target.id);

      expect(presentedIds()).not.toContain(target.id);
      expect(modalOpen()).toBe(false);
      expect(toastText()).toBe(`Transaction « ${target.label} » supprimée.`);
      expect(undoButton()).not.toBeNull();
    });

    it('annuler dans le délai restaure la transaction à sa position d’origine', () => {
      const before = presentedJson();

      deleteAndConfirm(target.id);
      undoButton()?.click();
      fixture.detectChanges();

      expect(presentedJson()).toBe(before);
      expect(fixture.nativeElement.querySelector('app-undo-toast')).toBeNull();
    });

    it('après 10 secondes, la notification disparaît et la suppression est définitive', () => {
      vi.useFakeTimers();
      deleteAndConfirm(target.id);

      vi.advanceTimersByTime(9_999);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-undo-toast')).not.toBeNull();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-undo-toast')).toBeNull();
      expect(presentedIds()).not.toContain(target.id);
    });

    it('une seconde suppression remplace la notification, et la première devient définitive', () => {
      const second = visible[0];

      deleteAndConfirm(target.id);
      deleteAndConfirm(second.id);

      expect(fixture.nativeElement.querySelectorAll('app-undo-toast')).toHaveLength(1);
      expect(toastText()).toBe(`Transaction « ${second.label} » supprimée.`);
      undoButton()?.click();
      fixture.detectChanges();
      expect(presentedIds()).toContain(second.id);
      expect(presentedIds()).not.toContain(target.id);
    });

    it('une nouvelle suppression recrée la notification, donc remet la barre de progression à pleine largeur', () => {
      const second = visible[0];

      deleteAndConfirm(target.id);
      const firstToast: Element | null = fixture.nativeElement.querySelector('app-undo-toast');
      deleteAndConfirm(second.id);
      const secondToast: Element | null = fixture.nativeElement.querySelector('app-undo-toast');

      expect(secondToast).not.toBeNull();
      expect(secondToast).not.toBe(firstToast);
    });

    it('un refus du précontrôle de suppression ne supprime rien et affiche le refus', () => {
      const removeSpy = vi.spyOn(transactionService, 'remove');
      vi.spyOn(budgetService, 'assertTransactionRemovable').mockImplementation(() => {
        throw new TransactionAggregateOverflowError();
      });
      const before = presentedJson();

      deleteAndConfirm(target.id);

      expect(removeSpy).not.toHaveBeenCalled();
      expect(presentedJson()).toBe(before);
      expect(modalOpen()).toBe(false);
      expect(toastText()).toBe('DELETE REFUSED');
      expect(undoButton()).toBeNull();
    });

    it('un refus du précontrôle de restauration ne restaure rien, garde le bouton et ne redémarre pas le délai', () => {
      vi.useFakeTimers();
      const restoreSpy = vi.spyOn(transactionService, 'restore');
      vi.spyOn(budgetService, 'assertTransactionRestorable').mockImplementation(() => {
        throw new TransactionAggregateOverflowError();
      });

      deleteAndConfirm(target.id);
      const afterDelete = presentedJson();
      vi.advanceTimersByTime(6_000);
      undoButton()?.click();
      fixture.detectChanges();

      expect(restoreSpy).not.toHaveBeenCalled();
      expect(presentedJson()).toBe(afterDelete);
      expect(toastText()).toBe('DELETE REFUSED');
      expect(undoButton()).not.toBeNull();

      vi.advanceTimersByTime(3_999);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-undo-toast')).not.toBeNull();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-undo-toast')).toBeNull();
    });

    it('après un refus de restauration, une nouvelle tentative dans le délai peut réussir', () => {
      vi.useFakeTimers();
      const before = presentedJson();
      vi.spyOn(budgetService, 'assertTransactionRestorable').mockImplementationOnce(() => {
        throw new TransactionAggregateOverflowError();
      });

      deleteAndConfirm(target.id);
      undoButton()?.click();
      fixture.detectChanges();
      undoButton()?.click();
      fixture.detectChanges();

      expect(presentedJson()).toBe(before);
      expect(fixture.nativeElement.querySelector('app-undo-toast')).toBeNull();
    });

    it('place le focus sur « Annuler la suppression » après la suppression', async () => {
      deleteAndConfirm(target.id);
      await fixture.whenStable();

      expect(document.activeElement).toBe(undoButton());
    });

    it('ramène le focus sur « Nouvelle transaction » quand la notification expire alors qu’elle a le focus', async () => {
      vi.useFakeTimers();
      deleteAndConfirm(target.id);
      await fixture.whenStable();
      undoButton()?.focus();

      vi.advanceTimersByTime(10_000);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.new-transaction-btn'));
    });
  });

  describe('liste filtrée par mois', () => {
    let monthContext: MonthContextService;

    function visibleTransactions(): TransactionPresentation[] {
      return component['transactions']();
    }

    beforeEach(() => {
      monthContext = TestBed.inject(MonthContextService);
      monthContext.setMonth('2026-10');
    });

    it('n’affiche que les transactions du mois sélectionné', () => {
      const expectedIds = MOCK_TRANSACTIONS.filter(t => t.monthKey === '2026-10').map(t => t.id);

      expect(visibleTransactions().map(t => t.id)).toEqual(expectedIds);
      expect(visibleTransactions().every(t => t.monthKey === '2026-10')).toBe(true);
    });

    it('met la liste à jour quand le mois change', () => {
      monthContext.setMonth('2026-11');

      expect(visibleTransactions().map(t => t.id)).toEqual(
        MOCK_TRANSACTIONS.filter(t => t.monthKey === '2026-11').map(t => t.id),
      );
    });

    it('bascule sur le mois de la transaction ajoutée et l’affiche', () => {
      component.onTransactionSubmit({ ...incomeInput, date: '2026-11-05' });

      expect(monthContext.monthKey()).toBe('2026-11');
      expect(visibleTransactions().some(t => t.label === incomeInput.label && t.date === '2026-11-05')).toBe(true);
      expect(visibleTransactions().every(t => t.monthKey === '2026-11')).toBe(true);
    });
  });
});
