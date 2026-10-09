import { computed, Injectable, signal } from '@angular/core';
import { Transaction, TransactionInput, TransactionPresentation } from '../models/transactions';
import { MOCK_TRANSACTIONS } from '../mocks/mock-transactions';
import { MoneyService } from './money';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  constructor(private readonly moneyService: MoneyService) {}

  // === ÉTAT INITIAL (signaux en lecture seule exposés) ===
  private readonly _transactions = signal<Transaction[]>(MOCK_TRANSACTIONS);

  readonly transactions = this._transactions.asReadonly();
  readonly presentationTransactions = computed<TransactionPresentation[]>(() =>
    this._transactions().map((transaction: Transaction) => ({
      ...transaction,
      amountEuros: this.moneyService.toEuros(transaction.amountCents),
    })),
  );

  // Méthode d'ajout pour les transactions
  add(transaction: TransactionInput): void {
    this._transactions.update(transactions => [
      ...transactions,
      { ...transaction, amountCents: this.moneyService.toCents(transaction.amountEuros) },
    ]);
  }
}
