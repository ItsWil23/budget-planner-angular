import { Injectable, signal } from '@angular/core';
import { Transaction } from '../models/transactions';
import { MOCK_TRANSACTIONS } from '../mocks/mock-transactions';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  // === ÉTAT INITIAL (signaux en lecture seule exposés) ===
  private readonly _transactions = signal<Transaction[]>(MOCK_TRANSACTIONS);

  readonly transactions = this._transactions.asReadonly();

  // Méthode d'ajout pour les transactions
  add(transaction: Transaction): void {
    this._transactions.update(txs => [...txs, transaction]);
  }
}
