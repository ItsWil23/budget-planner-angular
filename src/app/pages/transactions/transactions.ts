import { Component, inject, signal } from '@angular/core';
import { TransactionList } from '../../components/ui/transaction-list/transaction-list';
import { CategoryService } from '../../services/category';
import { Transaction } from '../../models/transactions';
import { Modal } from '../../components/ui/modal/modal';
import { TransactionForm } from '../../components/ui/transaction-form/transaction-form';
import { TransactionService } from '../../services/transaction';

@Component({
  selector: 'app-transactions',
  imports: [
    TransactionList,
    Modal,
    TransactionForm,
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class Transactions {
  protected readonly isModalOpened = signal(false);
  protected readonly transactionService = inject(TransactionService);

  protected readonly transactions = this.transactionService.transactions;
  protected readonly categoryService = inject(CategoryService);
  protected readonly categories = this.categoryService.categories;
  protected readonly subcategories = this.categoryService.subcategories;

  onTransactionSubmit(transaction: Transaction) {
    this.transactionService.add(transaction);
    this.isModalOpened.set(false);
  }

  onTransactionCancel() {
    this.isModalOpened.set(false);
  }
}
