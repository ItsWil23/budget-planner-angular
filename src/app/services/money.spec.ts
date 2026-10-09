import { describe, expect, it } from 'vitest';
import { MoneyService } from './money';

describe('Money Service', () => {
  const service = new MoneyService();

  describe('toCents', () => {
    it('convertit 39.99 en centimes (→ 3999)', () => {
      expect(service.toCents(39.99)).toBe(3999);
    });

    it('convertit un entier (10) vers centimes (→ 1000)', () => {
      expect(service.toCents(10)).toBe(1000);
    });

    it('convertit une valeur négative (-5.50) correctement', () => {
      expect(service.toCents(-5.50)).toBe(-550);
    });

    it('arrondit les demi-centimes en s’éloignant de zéro', () => {
      expect(service.toCents(1.125)).toBe(113);
      expect(service.toCents(-1.125)).toBe(-113);
      expect(service.toCents(1.005)).toBe(101);
      expect(service.toCents(-1.005)).toBe(-101);
    });

    it('convertit une valeur avec arrondi (.33 → 33)', () => {
      expect(service.toCents(0.33)).toBe(33);
    });

    it('arrondit au centime le plus proche (29.995 → 3000)', () => {
      expect(service.toCents(29.995)).toBe(3000);
    });

    it('gère une valeur décimale exacte (.123 → 12)', () => {
      expect(service.toCents(0.123)).toBe(12);
    });
  });

  describe('toEuros', () => {
    it('convertit 3999 centimes en euros (→ 39.99)', () => {
      expect(service.toEuros(3999)).toBe(39.99);
    });

    it('convertit 1000 centimes en euros (→ 10)', () => {
      expect(service.toEuros(1000)).toBe(10);
    });

    it('convertit une valeur négative (-550) correctement', () => {
      expect(service.toEuros(-550)).toBe(-5.5);
    });

    it('convertit 0 centime en euros (→ 0)', () => {
      expect(service.toEuros(0)).toBe(0);
    });

    it('convertit 500 centimes en 5 euros', () => {
      expect(service.toEuros(500)).toBe(5);
    });
  });

  describe('Roundtrip conversion', () => {
    it('roundtrip: centimes → euros → centimes revient au même', () => {
      const cents = 3999;
      const euros = service.toEuros(cents);
      const backToCents = service.toCents(euros);
      expect(backToCents).toBe(cents);
    });

    it('roundtrip: euros → centimes → euros revient au même', () => {
      const euros = 39.99;
      const cents = service.toCents(euros);
      const backToEuros = service.toEuros(cents);
      expect(backToEuros).toBeCloseTo(euros, 2);
    });

    it('roundtrip avec valeur négative fonctionne', () => {
      const euros = -5.50;
      const cents = service.toCents(euros);
      const backToEuros = service.toEuros(cents);
      expect(backToEuros).toBeCloseTo(euros, 2);
    });
  });

  describe('Valeurs limites', () => {
    it('gère des centimes négatifs très grands en valeur absolue', () => {
      const result = service.toCents(-999.99);
      expect(result).toBe(-99999);
    });

    it('gère 0 comme cas limite', () => {
      expect(service.toCents(0)).toBe(0);
      expect(service.toEuros(0)).toBe(0);
    });
  });
});
