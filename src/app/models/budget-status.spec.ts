import { describe, expect, it } from 'vitest';
import { getBudgetLineStatus } from './budget-status';

describe('getBudgetLineStatus', () => {
  it('retourne under à 0 %', () => {
    expect(getBudgetLineStatus(0, 10000)).toBe('under');
  });

  it('retourne under à exactement 80 %', () => {
    expect(getBudgetLineStatus(8000, 10000)).toBe('under');
  });

  it('retourne on-track juste au-dessus de 80 %', () => {
    expect(getBudgetLineStatus(8001, 10000)).toBe('on-track');
  });

  it('retourne on-track à exactement 100 %', () => {
    expect(getBudgetLineStatus(10000, 10000)).toBe('on-track');
  });

  it('retourne over juste au-dessus de 100 %', () => {
    expect(getBudgetLineStatus(10001, 10000)).toBe('over');
  });

  it('retourne on-track pour 1 centime sur 1 centime (100 %)', () => {
    expect(getBudgetLineStatus(1, 1)).toBe('on-track');
  });

  it('lève une erreur si plannedCents vaut 0', () => {
    expect(() => getBudgetLineStatus(0, 0)).toThrow();
  });

  it('lève une erreur si plannedCents est négatif', () => {
    expect(() => getBudgetLineStatus(0, -1)).toThrow();
  });

  it('lève une erreur si actualCents est négatif', () => {
    expect(() => getBudgetLineStatus(-1, 10000)).toThrow();
  });

  it('lève une erreur si actualCents n’est pas un entier', () => {
    expect(() => getBudgetLineStatus(10.5, 10000)).toThrow();
  });

  it('lève une erreur si plannedCents n’est pas un entier', () => {
    expect(() => getBudgetLineStatus(100, 10.5)).toThrow();
  });
});
