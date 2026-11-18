import { Component, ElementRef, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TransactionList } from '../../components/ui/transaction-list/transaction-list';
import { CategoryService } from '../../services/category';
import { TransactionInput } from '../../models/transactions';
import { Modal } from '../../components/ui/modal/modal';
import { TransactionForm } from '../../components/ui/transaction-form/transaction-form';
import { TransactionService } from '../../services/transaction';
import { BudgetService, TransactionAggregateOverflowError } from '../../services/budget';
import { MonthContextService } from '../../services/month-context';

@Component({
  selector: 'app-transactions',
  imports: [
    TransactionList,
    Modal,
    TransactionForm,
    TranslocoPipe,
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class Transactions {
  protected readonly isModalOpened = signal(false);
  protected readonly aggregateOverflow = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly transactionService = inject(TransactionService);
  protected readonly budgetService = inject(BudgetService);

  protected readonly monthContext = inject(MonthContextService);
  protected readonly transactions = computed(() =>
    this.transactionService.transactionsForMonth(this.monthContext.monthKey()),
  );
  protected readonly editingTransaction = computed(() => {
    const id = this.editingId();
    return id ? (this.transactions().find(transaction => transaction.id === id) ?? null) : null;
  });
  protected readonly categoryService = inject(CategoryService);
  protected readonly categories = this.categoryService.categories;
  protected readonly subcategories = this.categoryService.subcategories;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  onTransactionSubmit(transaction: TransactionInput): void {
    const editedId = this.editingId();
    if (editedId) {
      this.submitEdit(editedId, transaction);
      return;
    }

    if (!this.precheck(() => this.budgetService.assertTransactionAddable(transaction))) return;

    const added = this.transactionService.add(transaction);
    this.monthContext.setMonth(added.monthKey);
    this.closeModal();
  }

  onTransactionDraftChange(): void {
    this.aggregateOverflow.set(false);
  }

  onTransactionCancel(): void {
    this.closeModal();
  }

  onModalClosed(): void {
    this.closeModal();
  }

  openModal(): void {
    this.editingId.set(null);
    this.aggregateOverflow.set(false);
    this.isModalOpened.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.aggregateOverflow.set(false);
    this.isModalOpened.set(true);
  }

  private submitEdit(id: string, input: TransactionInput): void {
    if (!this.precheck(() => this.budgetService.assertTransactionUpdatable(id, input))) return;

    const updated = this.transactionService.update(id, input);
    this.monthContext.setMonth(updated.monthKey);
    this.closeModal();
  }

  // Renvoie false si la saisie dépasse les totaux agrégés : la modale reste ouverte avec le brouillon.
  private precheck(check: () => void): boolean {
    try {
      check();
      return true;
    } catch (error: unknown) {
      if (error instanceof TransactionAggregateOverflowError) {
        this.aggregateOverflow.set(true);
        return false;
      }
      throw error;
    }
  }

  private closeModal(): void {
    const editedId = this.editingId();
    this.aggregateOverflow.set(false);
    this.editingId.set(null);
    this.isModalOpened.set(false);
    if (editedId) this.focusRowMenu(editedId);
  }

  // La modale rend le focus à l'élément qui l'a ouverte, déjà retiré du DOM après un menu de ligne :
  // on le replace sur le déclencheur du menu de la ligne éditée, si elle est toujours affichée.
  private focusRowMenu(id: string): void {
    afterNextRender(
      () => {
        const triggers = this.host.nativeElement.querySelectorAll<HTMLElement>('[data-menu-trigger]');
        Array.from(triggers).find(trigger => trigger.dataset['menuTrigger'] === id)?.focus();
      },
      { injector: this.injector },
    );
  }
}
