import { TestBed } from '@angular/core/testing';
import { MoneyService } from '../../../services/money';
import { MoneyPipe } from './money-pipe';

describe('MoneyPipe', () => {
  let pipe: MoneyPipe;
  const frSettings = { currency: 'EUR', locale: 'fr-FR' };
  const enSettings = { currency: 'USD', locale: 'en-US' };

  beforeEach(() => {
    pipe = new MoneyPipe(TestBed.inject(MoneyService));
  });

  it('should prefix an income with a plus sign in EUR fr-FR with two decimals', () => {
    expect(pipe.transform(3999, frSettings, 'income')).toBe('+39,99\u00a0€');
    expect(pipe.transform(1000, frSettings, 'income')).toBe('+10,00\u00a0€');
  });

  it('should prefix an expense with a typographic minus sign in EUR fr-FR with two decimals', () => {
    expect(pipe.transform(3999, frSettings, 'expense')).toBe('\u221239,99\u00a0€');
  });

  it('should use the absolute value for an income even when the stored amount is negative', () => {
    expect(pipe.transform(-3999, frSettings, 'income')).toBe('+39,99\u00a0€');
  });

  it('should keep the negative sign of a signed amount without type', () => {
    expect(pipe.transform(-550, frSettings)).toBe('\u22125,50\u00a0€');
  });

  it('should not add a plus sign to a positive amount without type', () => {
    expect(pipe.transform(1000, frSettings)).toBe('10,00\u00a0€');
  });

  it('should format USD en-US with dollar symbol, grouping and dot decimal', () => {
    expect(pipe.transform(123456, enSettings)).toBe('$1,234.56');
    expect(pipe.transform(123456, enSettings, 'income')).toBe('+$1,234.56');
    expect(pipe.transform(123456, enSettings, 'expense')).toBe('\u2212$1,234.56');
  });

  it('should reject a fractional amount in cents', () => {
    expect(() => pipe.transform(10.5, frSettings)).toThrow(new Error('Invalid amount'));
  });

  it('should reject an unsafe integer amount in cents', () => {
    expect(() => pipe.transform(Number.MAX_SAFE_INTEGER + 1, frSettings)).toThrow(new Error('Invalid amount'));
    expect(() => pipe.transform(-(Number.MAX_SAFE_INTEGER + 1), frSettings, 'expense')).toThrow(
      new Error('Invalid amount'),
    );
  });

  it('should keep the signed zero rendering of an expense of zero', () => {
    expect(pipe.transform(0, frSettings, 'expense')).toBe('\u22120,00\u00a0€');
    expect(pipe.transform(0, frSettings, 'income')).toBe('+0,00\u00a0€');
  });

  describe('frontier amounts at Number.MAX_SAFE_INTEGER cents', () => {
    it.each([
      { cents: 9007199254740989, fr: '90\u202f071\u202f992\u202f547\u202f409,89\u00a0€', en: '$90,071,992,547,409.89' },
      { cents: 9007199254740990, fr: '90\u202f071\u202f992\u202f547\u202f409,90\u00a0€', en: '$90,071,992,547,409.90' },
      { cents: 9007199254740991, fr: '90\u202f071\u202f992\u202f547\u202f409,91\u00a0€', en: '$90,071,992,547,409.91' },
    ])('renders $cents exactly without a type', ({ cents, fr, en }) => {
      expect(pipe.transform(cents, frSettings)).toBe(fr);
      expect(pipe.transform(cents, enSettings)).toBe(en);
    });

    it.each([
      { cents: -9007199254740989, fr: '\u221290\u202f071\u202f992\u202f547\u202f409,89\u00a0€', en: '\u2212$90,071,992,547,409.89' },
      { cents: -9007199254740990, fr: '\u221290\u202f071\u202f992\u202f547\u202f409,90\u00a0€', en: '\u2212$90,071,992,547,409.90' },
      { cents: -9007199254740991, fr: '\u221290\u202f071\u202f992\u202f547\u202f409,91\u00a0€', en: '\u2212$90,071,992,547,409.91' },
    ])('renders $cents exactly with a typographic minus sign', ({ cents, fr, en }) => {
      expect(pipe.transform(cents, frSettings)).toBe(fr);
      expect(pipe.transform(cents, enSettings)).toBe(en);
    });

    it('renders the largest safe amount with the income and expense signs without losing cents', () => {
      expect(pipe.transform(9007199254740991, frSettings, 'income')).toBe(
        '+90\u202f071\u202f992\u202f547\u202f409,91\u00a0€',
      );
      expect(pipe.transform(9007199254740991, enSettings, 'expense')).toBe('\u2212$90,071,992,547,409.91');
    });
  });
});
