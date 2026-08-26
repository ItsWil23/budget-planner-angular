import { Component, signal } from '@angular/core';
import { TransactionList } from '../../components/ui/transaction-list/transaction-list';
import { MOCK_CATEGORIES, MOCK_SUBCATEGORIES } from '../../mocks/mock-categories';
import { Category, Subcategory } from '../../models/category';
import { MOCK_TRANSACTIONS } from '../../mocks/mock-transactions';
import { Transaction } from '../../models/transactions';

@Component({
  selector: 'app-transactions',
  imports: [TransactionList],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class Transactions {


  protected readonly transactions = signal<Transaction[]>(MOCK_TRANSACTIONS);
  protected readonly categories = signal<Category[]>(MOCK_CATEGORIES);
  protected readonly subcategories = signal<Subcategory[]>(MOCK_SUBCATEGORIES);
}
