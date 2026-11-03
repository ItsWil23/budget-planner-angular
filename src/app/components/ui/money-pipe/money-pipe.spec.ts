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
});
