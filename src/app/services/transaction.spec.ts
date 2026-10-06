import { describe, it, expect } from 'vitest';
import type { Transaction } from '../models/transactions';
import { TransactionService } from './transaction';

describe('TransactionService', () => {
  let service: TransactionService;
  let addedTransaction: Transaction;

  beforeEach(() => {
    service = new TransactionService();

    // Préparer une nouvelle transaction pour les tests d'ajout
    addedTransaction = {
      id: 'tx-10',
      label: 'Test transaction',
      categoryId: 'cat-1',
      subcategoryId: 'sub-1',
      date: '2026-10-06',
      amount: 100,
      type: 'income',
    };
  });

  describe('Initial state', () => {
    it('should expose transactions signal with initial mock data', () => {
      const transactions = service.transactions();
      expect(transactions).toBeDefined();
      expect(transactions.length).toBe(9); // Les 9 transactions initiales (tx-1 à tx-9)
      expect(transactions[0].id).toBe('tx-1');
      expect(transactions[0].label).toBe('Salaire mensuel');
    });
  });

  describe('Transaction mutations', () => {
    it('should add a new transaction to the list', () => {
      const initialCount = service.transactions().length;

      service.add(addedTransaction);

      expect(service.transactions().length).toBe(initialCount + 1);
      expect(service.transactions()[9].id).toBe('tx-10');
      expect(service.transactions()[9].label).toBe('Test transaction');
    });

    it('should append new transaction at the end', () => {
      service.add(addedTransaction);

      const transactions = service.transactions();
      expect(transactions[transactions.length - 1].id).toBe('tx-10');
    });

    it('should not mutate existing transactions when adding new ones', () => {
      const transactionsBefore = service.transactions();
      const initialFirstTransaction = transactionsBefore[0];

      service.add(addedTransaction);
      expect(transactionsBefore).toHaveLength(9); // Vérifier que la liste initiale n'est pas mutée en place
      const transactionsAfter = service.transactions();

      expect(transactionsAfter).not.toBe(transactionsBefore); // Nouvelle référence du signal
      expect(transactionsAfter.length).toBe(10);
      expect(transactionsAfter[0]).toBe(initialFirstTransaction); // Même référence pour la première transaction
    });

    it('should maintain correct transaction count after multiple adds', () => {
      const initialCount = service.transactions().length;

      const tx1: Transaction = { ...addedTransaction, id: 'tx-11' };
      const tx2: Transaction = { ...addedTransaction, id: 'tx-12' };

      service.add(tx1);
      service.add(tx2);

      expect(service.transactions().length).toBe(initialCount + 2);
      expect(service.transactions()[initialCount].id).toBe('tx-11');
      expect(service.transactions()[initialCount + 1].id).toBe('tx-12');
    });
  });
});
