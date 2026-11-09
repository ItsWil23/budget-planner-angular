import { Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TransactionList } from '../../components/ui/transaction-list/transaction-list';
import { CategoryService } from '../../services/category';
import { TransactionInput } from '../../models/transactions';
import { Modal } from '../../components/ui/modal/modal';
import { TransactionForm } from '../../components/ui/transaction-form/transaction-form';
import { TransactionService } from '../../services/transaction';
import { BudgetService, TransactionAggregateOverflowError } from '../../services/budget';

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

  protected readonly transactions = this.transactionService.presentationTransactions;
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

    this.transactionService.add(transaction);
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
