import { describe, it, expect } from 'vitest';
import type { TransactionInput } from '../models/transactions';
import { MOCK_TRANSACTIONS } from '../mocks/mock-transactions';
import { MoneyService } from './money';
import { TransactionService } from './transaction';

describe('TransactionService', () => {
  let service: TransactionService;
  let addedTransaction: TransactionInput;

  beforeEach(() => {
    service = new TransactionService(new MoneyService());

    // Préparer une nouvelle transaction pour les tests d'ajout
    addedTransaction = {
      label: 'Test transaction',
      categoryId: 'cat-1',
      subcategoryId: 'sub-1',
      date: '2026-10-06',
      amountCents: 123,
      type: 'income',
    };
  });

  describe('Initial state', () => {
    it('should expose transactions signal with initial mock data', () => {
      const transactions = service.transactions();
      expect(transactions).toBeDefined();
      expect(transactions.length).toBe(MOCK_TRANSACTIONS.length);
      expect(transactions[0].id).toBe('tx-1');
      expect(transactions[0].label).toBe('Salaire mensuel');
      expect(transactions[2].amountCents).toBe(3999);
    });
  });

  describe('Transaction mutations', () => {
    it('should add a new transaction to the list', () => {
      const initialCount = service.transactions().length;

      const created = service.add(addedTransaction);

      expect(service.transactions().length).toBe(initialCount + 1);
      expect(service.transactions()[initialCount].id).toBe(created.id);
      expect(service.transactions()[initialCount].label).toBe('Test transaction');
      expect(service.transactions()[initialCount].amountCents).toBe(123);
      expect(service.presentationTransactions()[initialCount].amountEuros).toBe(1.23);
    });

    it('should append new transaction at the end', () => {
      const created = service.add(addedTransaction);

      const transactions = service.transactions();
      expect(transactions[transactions.length - 1].id).toBe(created.id);
    });

    it('should not mutate existing transactions when adding new ones', () => {
      const transactionsBefore = service.transactions();
      const initialFirstTransaction = transactionsBefore[0];

      service.add(addedTransaction);
      expect(transactionsBefore).toHaveLength(MOCK_TRANSACTIONS.length); // Vérifier que la liste initiale n'est pas mutée en place
      const transactionsAfter = service.transactions();

      expect(transactionsAfter).not.toBe(transactionsBefore); // Nouvelle référence du signal
      expect(transactionsAfter.length).toBe(MOCK_TRANSACTIONS.length + 1);
      expect(transactionsAfter[0]).toBe(initialFirstTransaction); // Même référence pour la première transaction
    });

    it('should maintain correct transaction count after multiple adds', () => {
      const initialCount = service.transactions().length;

      const first = service.add(addedTransaction);
      const second = service.add(addedTransaction);

      expect(service.transactions().length).toBe(initialCount + 2);
      expect(service.transactions()[initialCount].id).toBe(first.id);
      expect(service.transactions()[initialCount + 1].id).toBe(second.id);
      expect(first.id).not.toBe(second.id);
    });
  });

  describe('add()', () => {
    it('should generate a UUID id', () => {
      const created = service.add(addedTransaction);

      expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should derive monthKey from date and set a valid ISO createdAt', () => {
      const created = service.add(addedTransaction);

      expect(created.monthKey).toBe('2026-10');
      expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);
    });

    it('should store only amountCents, never amountEuros', () => {
      const created = service.add(addedTransaction);

      expect(created.amountCents).toBe(123);
      expect(created).not.toHaveProperty('amountEuros');
      const stored = service.transactions().find(t => t.id === created.id);
      expect(stored).toBeDefined();
      expect(stored).not.toHaveProperty('amountEuros');
    });

    it('should reject a date that is not in YYYY-MM-DD format', () => {
      const countBefore = service.transactions().length;

      expect(() => service.add({ ...addedTransaction, date: '06/10/2026' })).toThrow('Invalid date format');
      expect(() => service.add({ ...addedTransaction, date: '2026-10' })).toThrow('Invalid date format');
      expect(service.transactions().length).toBe(countBefore);
    });

    it.each([0, -1, 0.5, 1.23, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
      'should reject an amount that is not a positive safe integer in cents (%s)',
      (amountCents: number) => {
        const countBefore = service.transactions().length;

        expect(() => service.add({ ...addedTransaction, amountCents })).toThrow('Invalid amount');
        expect(service.transactions().length).toBe(countBefore);
      },
    );

    it.each([1, Number.MAX_SAFE_INTEGER])('should accept the positive safe integer %s as cents', (amountCents: number) => {
      const created = service.add({ ...addedTransaction, amountCents });

      expect(created.amountCents).toBe(amountCents);
      expect(service.transactions().find(t => t.id === created.id)?.amountCents).toBe(amountCents);
    });

    it('should preserve the date, label and type of the input', () => {
      const created = service.add(addedTransaction);

      expect(created).toEqual(
        expect.objectContaining({
          label: 'Test transaction',
          categoryId: 'cat-1',
          subcategoryId: 'sub-1',
          date: '2026-10-06',
          type: 'income',
        }),
      );
    });
  });

  describe('transactionsForMonth()', () => {
    it('should return only the transactions of the requested month', () => {
      const expected = MOCK_TRANSACTIONS.filter(t => t.monthKey === '2026-10');

      const october = service.transactionsForMonth('2026-10');

      expect(expected.length).toBeGreaterThan(0);
      expect(october.map(t => t.id)).toEqual(expected.map(t => t.id));
      expect(october.every(t => t.monthKey === '2026-10')).toBe(true);
    });

    it('should return an empty list for a month without transactions', () => {
      expect(service.transactionsForMonth('2025-01')).toEqual([]);
    });

    it('should include a newly added transaction in its month only', () => {
      service.add({ ...addedTransaction, date: '2026-10-20' });

      expect(service.transactionsForMonth('2026-10')).toHaveLength(
        MOCK_TRANSACTIONS.filter(t => t.monthKey === '2026-10').length + 1,
      );
      expect(service.transactionsForMonth('2026-11')).toHaveLength(
        MOCK_TRANSACTIONS.filter(t => t.monthKey === '2026-11').length,
      );
    });

    it('should return amountEuros in the presentation', () => {
      const october = service.transactionsForMonth('2026-10');

      expect(october.every(t => typeof t.amountEuros === 'number')).toBe(true);
    });
  });

  describe('Mock data', () => {
    it.each(['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'])(
      'should contain at least one income and one expense for %s',
      (monthKey: string) => {
        const monthTransactions = MOCK_TRANSACTIONS.filter(t => t.monthKey === monthKey);

        expect(monthTransactions.some(t => t.type === 'income')).toBe(true);
        expect(monthTransactions.some(t => t.type === 'expense')).toBe(true);
      },
    );

    it('should keep monthKey consistent with date for every mock', () => {
      MOCK_TRANSACTIONS.forEach(t => expect(t.monthKey).toBe(t.date.slice(0, 7)));
    });

    it('should store integer cent amounts for every mock', () => {
      MOCK_TRANSACTIONS.forEach(t => expect(Number.isInteger(t.amountCents)).toBe(true));
    });

    it('should expose every transaction in presentationTransactions with amountEuros', () => {
      const presentation = service.presentationTransactions();

      expect(presentation).toHaveLength(MOCK_TRANSACTIONS.length);
      expect(presentation[0].amountEuros).toBe(2450);
    });
  });
});
