import { Component, computed, inject, signal } from '@angular/core';
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
  protected readonly transactionService = inject(TransactionService);
  protected readonly budgetService = inject(BudgetService);

  protected readonly monthContext = inject(MonthContextService);
  protected readonly transactions = computed(() =>
    this.transactionService.transactionsForMonth(this.monthContext.monthKey()),
  );
  protected readonly categoryService = inject(CategoryService);
  protected readonly categories = this.categoryService.categories;
  protected readonly subcategories = this.categoryService.subcategories;

  onTransactionSubmit(transaction: TransactionInput): void {
    try {
      this.budgetService.assertTransactionAddable(transaction);
    } catch (error: unknown) {
      if (error instanceof TransactionAggregateOverflowError) {
        this.aggregateOverflow.set(true);
        return;
      }
      throw error;
    }

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
    this.aggregateOverflow.set(false);
    this.isModalOpened.set(true);
  }

  private closeModal(): void {
    this.aggregateOverflow.set(false);
    this.isModalOpened.set(false);
  }
}
