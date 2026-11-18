import { computed, Injectable, signal } from '@angular/core';
import { CategoryType } from '../models/category';
import {
  RemovedTransaction,
  Transaction,
  TransactionInput,
  TransactionPresentation,
} from '../models/transactions';
import { MOCK_TRANSACTIONS } from '../mocks/mock-transactions';
import { CategoryService } from './category';
import { MoneyService } from './money';

export const TRANSACTION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date du jour au format AAAA-MM-JJ, en heure locale (et non UTC).
 */
export function todayLocalIsoDate(): string {
  const now = new Date();
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

/**
 * Déduit le type de la transaction (revenu ou dépense) de sa catégorie, après avoir vérifié que la catégorie
 * existe et que la sous-catégorie lui appartient.
 *
 * @throws Error('Category not found') si la catégorie est introuvable
 * @throws Error('Subcategory not in category') si la sous-catégorie est introuvable ou d'une autre catégorie
 */
export function resolveTransactionType(
  input: Pick<TransactionInput, 'categoryId' | 'subcategoryId'>,
  categoryService: CategoryService,
): CategoryType {
  const category = categoryService.categories().find(cat => cat.id === input.categoryId);
  if (!category) {
    throw new Error('Category not found');
  }

  const subcategory = categoryService.subcategories().find(sub => sub.id === input.subcategoryId);
  if (!subcategory || subcategory.categoryId !== category.id) {
    throw new Error('Subcategory not in category');
  }

  return category.type;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  constructor(
    private readonly moneyService: MoneyService,
    private readonly categoryService: CategoryService,
  ) {}

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
    const type = resolveTransactionType(input, this.categoryService);

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      label: input.label,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      date: input.date,
      monthKey: input.date.slice(0, 7),
      amountCents: input.amountCents,
      type,
      createdAt: new Date().toISOString(),
    };

    this._transactions.update(transactions => [...transactions, transaction]);
    return transaction;
  }

  // Remplace la transaction `id` par une nouvelle saisie, en gardant son identifiant et sa date de création
  update(id: string, input: TransactionInput): Transaction {
    assertValidTransactionInput(input);
    const current = this.findOrThrow(id);
    const type = resolveTransactionType(input, this.categoryService);

    const transaction: Transaction = {
      id: current.id,
      label: input.label,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      date: input.date,
      monthKey: input.date.slice(0, 7),
      amountCents: input.amountCents,
      type,
      createdAt: current.createdAt,
    };

    this._transactions.update(transactions =>
      transactions.map(existing => (existing.id === id ? transaction : existing)),
    );
    return transaction;
  }

  // Retire la transaction `id` et renvoie sa valeur et sa position, pour permettre une restauration
  remove(id: string): RemovedTransaction {
    const index = this._transactions().findIndex(transaction => transaction.id === id);
    if (index === -1) {
      throw new Error('Transaction not found');
    }
    const transaction = this._transactions()[index];

    this._transactions.update(transactions => transactions.filter(existing => existing.id !== id));
    return { transaction, index };
  }

  // Réinsère une transaction retirée à sa position d'origine
  restore(removed: RemovedTransaction): void {
    if (this._transactions().some(transaction => transaction.id === removed.transaction.id)) {
      throw new Error('Transaction already exists');
    }

    this._transactions.update(transactions => [
      ...transactions.slice(0, removed.index),
      removed.transaction,
      ...transactions.slice(removed.index),
    ]);
  }

  transactionsForMonth(monthKey: string): TransactionPresentation[] {
    return this.presentationTransactions().filter(
      (transaction: TransactionPresentation) => transaction.monthKey === monthKey,
    );
  }

  private findOrThrow(id: string): Transaction {
    const transaction = this._transactions().find(current => current.id === id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }
}
