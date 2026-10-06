import { Component, inject, signal } from '@angular/core';
import { TransactionList } from '../../components/ui/transaction-list/transaction-list';
import { CategoryService } from '../../services/category';
import { Category, Subcategory } from '../../models/category';
import { MOCK_TRANSACTIONS } from '../../mocks/mock-transactions';
import { Transaction } from '../../models/transactions';
import { Modal } from '../../components/ui/modal/modal';
import { TransactionForm } from '../../components/ui/transaction-form/transaction-form';

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

  protected readonly transactions = signal<Transaction[]>(MOCK_TRANSACTIONS);
  protected readonly categoryService = inject(CategoryService);
  protected readonly categories = this.categoryService.categories;
  protected readonly subcategories = this.categoryService.subcategories;

  onTransactionSubmit(transaction: Transaction) {
    this.transactions.update(transactions => [...transactions, transaction]);
    this.isModalOpened.set(false);
  }

  onTransactionCancel() {
    this.isModalOpened.set(false);
  }
}
