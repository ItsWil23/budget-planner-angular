import { computed, Injectable, signal } from '@angular/core';
import { Transaction, TransactionInput, TransactionPresentation } from '../models/transactions';
import { MOCK_TRANSACTIONS } from '../mocks/mock-transactions';
import { MoneyService } from './money';

export const TRANSACTION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valide la date et les centimes d'une saisie de transaction. Partagé par `add()` et par le précontrôle
 * de `BudgetService`, pour que les deux acceptent exactement les mêmes entrées.
 *
 * @throws Error('Invalid date format') si la date n'est pas au format AAAA-MM-JJ
 * @throws Error('Invalid amount') si les centimes ne sont pas un entier sûr strictement positif
 */
export function assertValidTransactionInput(input: TransactionInput): void {
  if (!TRANSACTION_DATE_PATTERN.test(input.date)) {
    throw new Error('Invalid date format');
  }

  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Invalid amount');
  }
}

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

  // Méthode d'ajout pour les transactions : génère id, monthKey et createdAt
  add(input: TransactionInput): Transaction {
    assertValidTransactionInput(input);

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      label: input.label,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      date: input.date,
      monthKey: input.date.slice(0, 7),
      amountCents: input.amountCents,
      type: input.type,
      createdAt: new Date().toISOString(),
    };

    this._transactions.update(transactions => [...transactions, transaction]);
    return transaction;
  }

  transactionsForMonth(monthKey: string): TransactionPresentation[] {
    return this.presentationTransactions().filter(
      (transaction: TransactionPresentation) => transaction.monthKey === monthKey,
    );
  }
}
