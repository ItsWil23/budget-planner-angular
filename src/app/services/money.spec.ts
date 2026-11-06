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

  describe('parseEurosInput', () => {
    it('convertit une saisie exacte en centimes (virgule ou point)', () => {
      expect(service.parseEurosInput('39,99')).toEqual({ valid: true, cents: 3999 });
      expect(service.parseEurosInput('-12.50')).toEqual({ valid: true, cents: -1250 });
      expect(service.parseEurosInput('10')).toEqual({ valid: true, cents: 1000 });
      expect(service.parseEurosInput('0.5')).toEqual({ valid: true, cents: 50 });
    });

    it('accepte le signe moins typographique et les espaces autour', () => {
      expect(service.parseEurosInput(' \u22125 ')).toEqual({ valid: true, cents: -500 });
    });

    it('renvoie un zéro positif pour « -0 »', () => {
      expect(service.parseEurosInput('-0')).toEqual({ valid: true, cents: 0 });
    });

    it.each(['', 'abc', '1.234', '-', '12,345', '1,2,3', '.5'])(
      'refuse « %s » comme format invalide',
      raw => {
        expect(service.parseEurosInput(raw)).toEqual({ valid: false, error: 'invalid' });
      },
    );

    it.each([
      { raw: '90071992547409.89', cents: 9007199254740989 },
      { raw: '90071992547409.90', cents: 9007199254740990 },
      { raw: '90071992547409.91', cents: 9007199254740991 },
      { raw: '-90071992547409.89', cents: -9007199254740989 },
      { raw: '-90071992547409.90', cents: -9007199254740990 },
      { raw: '-90071992547409.91', cents: -9007199254740991 },
    ])('convertit exactement $raw en $cents centimes à la frontière', ({ raw, cents }) => {
      expect(service.parseEurosInput(raw)).toEqual({ valid: true, cents });
    });

    it.each(['90071992547409.92', '-90071992547409.92', '90071992547410'])(
      'refuse %s quand ses centimes dépassent les entiers sûrs',
      raw => {
        expect(service.parseEurosInput(raw)).toEqual({ valid: false, error: 'tooLarge' });
      },
    );

    it('refuse une saisie extrêmement longue sans erreur de conversion', () => {
      expect(service.parseEurosInput('9'.repeat(400))).toEqual({ valid: false, error: 'tooLarge' });
      expect(service.parseEurosInput(`-${'9'.repeat(400)}`)).toEqual({ valid: false, error: 'tooLarge' });
    });
  });

  describe('toEditableString', () => {
    it('formate les centimes en euros avec virgule et sans séparateur de milliers', () => {
      expect(service.toEditableString(3999, 'fr-FR')).toBe('39,99');
      expect(service.toEditableString(123456789, 'fr-FR')).toBe('1234567,89');
    });

    it('retire les zéros décimaux inutiles et garde le signe', () => {
      expect(service.toEditableString(0, 'fr-FR')).toBe('0');
      expect(service.toEditableString(1000, 'fr-FR')).toBe('10');
      expect(service.toEditableString(1050, 'fr-FR')).toBe('10,5');
      expect(service.toEditableString(1005, 'fr-FR')).toBe('10,05');
      expect(service.toEditableString(-5, 'fr-FR')).toBe('-0,05');
      expect(service.toEditableString(-1000, 'fr-FR')).toBe('-10');
    });

    it('utilise le séparateur décimal de la locale', () => {
      expect(service.toEditableString(-1250, 'en-US')).toBe('-12.5');
      expect(service.toEditableString(1299, 'en-US')).toBe('12.99');
    });

    it.each([9007199254740989, 9007199254740990, 9007199254740991])(
      'se relit exactement en centimes à la frontière : %s',
      cents => {
        expect(service.toEditableString(cents, 'fr-FR')).toMatch(/^\d+(,\d{1,2})?$/);
        expect(service.parseEurosInput(service.toEditableString(cents, 'fr-FR'))).toEqual({
          valid: true,
          cents,
        });
        expect(service.parseEurosInput(service.toEditableString(cents, 'en-US'))).toEqual({
          valid: true,
          cents,
        });
      },
    );

    it.each([-9007199254740989, -9007199254740990, -9007199254740991])(
      'se relit exactement en centimes à la frontière négative : %s',
      cents => {
        expect(service.parseEurosInput(service.toEditableString(cents, 'fr-FR'))).toEqual({
          valid: true,
          cents,
        });
        expect(service.parseEurosInput(service.toEditableString(cents, 'en-US'))).toEqual({
          valid: true,
          cents,
        });
      },
    );

    it('affiche 9007199254740991 centimes sans perte de chiffre', () => {
      expect(service.toEditableString(9007199254740991, 'fr-FR')).toBe('90071992547409,91');
    });
  });

  describe('formatCents', () => {
    const eur = { currency: 'EUR', locale: 'fr-FR' };
    const usd = { currency: 'USD', locale: 'en-US' };

    it('formate EUR fr-FR avec groupement, deux décimales et symbole après le montant', () => {
      expect(service.formatCents(123456, eur)).toBe('1\u202f234,56\u00a0€');
      expect(service.formatCents(3999, eur)).toBe('39,99\u00a0€');
    });

    it('formate USD en-US avec symbole devant et point décimal', () => {
      expect(service.formatCents(123456, usd)).toBe('$1,234.56');
    });

    it('préfixe les montants positifs avec signDisplay always et garde le tiret ASCII pour les négatifs', () => {
      expect(service.formatCents(123456, usd, 'always')).toBe('+$1,234.56');
      expect(service.formatCents(-1250, usd)).toBe('-$12.50');
      expect(service.formatCents(-1250, eur, 'always')).toBe('-12,50\u00a0€');
    });

    it('conserve le signe d’un zéro négatif comme l’ancien formatage Intl', () => {
      expect(service.formatCents(-0, usd)).toBe('-$0.00');
      expect(service.formatCents(-0, usd, 'always')).toBe('-$0.00');
      expect(service.formatCents(0, usd, 'always')).toBe('+$0.00');
    });

    it.each([
      { cents: 9007199254740989, fr: '90\u202f071\u202f992\u202f547\u202f409,89\u00a0€', en: '$90,071,992,547,409.89' },
      { cents: 9007199254740990, fr: '90\u202f071\u202f992\u202f547\u202f409,90\u00a0€', en: '$90,071,992,547,409.90' },
      { cents: 9007199254740991, fr: '90\u202f071\u202f992\u202f547\u202f409,91\u00a0€', en: '$90,071,992,547,409.91' },
      { cents: -9007199254740989, fr: '-90\u202f071\u202f992\u202f547\u202f409,89\u00a0€', en: '-$90,071,992,547,409.89' },
      { cents: -9007199254740990, fr: '-90\u202f071\u202f992\u202f547\u202f409,90\u00a0€', en: '-$90,071,992,547,409.90' },
      { cents: -9007199254740991, fr: '-90\u202f071\u202f992\u202f547\u202f409,91\u00a0€', en: '-$90,071,992,547,409.91' },
    ])('formate exactement les centimes à la frontière $cents', ({ cents, fr, en }) => {
      expect(service.formatCents(cents, eur)).toBe(fr);
      expect(service.formatCents(cents, usd)).toBe(en);
    });

    it.each([10.5, 0.49, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, -(Number.MAX_SAFE_INTEGER + 1)])(
      'refuse %s avec « Invalid amount »',
      cents => {
        expect(() => service.formatCents(cents, eur)).toThrow(new Error('Invalid amount'));
      },
    );
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
