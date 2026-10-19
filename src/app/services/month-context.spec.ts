import { MonthContextService } from './month-context';

describe('MonthContextService', () => {
  it('provides a valid initial month key on instantiation', () => {
    const service = new MonthContextService();
    const monthKey = service.monthKey();

    expect(typeof monthKey).toBe('string');
    expect(monthKey.match(/^\d{4}-(0[1-9]|1[0-2])$/)).toBeTruthy();
  });

  it('returns the same initial value across instances', () => {
    const first = new MonthContextService();
    const second = new MonthContextService();

    expect(first.monthKey()).toBe(second.monthKey());
  });

  it('updates monthKey when setMonth is called with a valid value', () => {
    const service = new MonthContextService();

    service.setMonth('2026-03');

    expect(service.monthKey()).toBe('2026-03');
  });

  it('rejects invalid month keys and preserves the previous value', () => {
    const service = new MonthContextService();
    const initialMonth = service.monthKey();

    expect(() => service.setMonth('2026-13')).toThrow();
    expect(service.monthKey()).toBe(initialMonth);

    expect(() => service.setMonth('2026-00')).toThrow();
    expect(service.monthKey()).toBe(initialMonth);

    expect(() => service.setMonth('2026-1')).toThrow();
    expect(service.monthKey()).toBe(initialMonth);

    expect(() => service.setMonth('26-10')).toThrow();
    expect(service.monthKey()).toBe(initialMonth);

    expect(() => service.setMonth('2026/10')).toThrow();
    expect(service.monthKey()).toBe(initialMonth);

    expect(() => service.setMonth('')).toThrow();
    expect(service.monthKey()).toBe(initialMonth);
  });

  it('accepts valid month keys in different months', () => {
    const service = new MonthContextService();
    const initialMonth = service.monthKey();

    service.setMonth('2026-01');
    expect(service.monthKey()).toBe('2026-01');

    service.setMonth('2026-12');
    expect(service.monthKey()).toBe('2026-12');

    service.setMonth(initialMonth);
    expect(service.monthKey()).toBe(initialMonth);
  });

  it('maintains immutability via asReadonly', () => {
    const service = new MonthContextService();

    // Fonction jamais appelée : elle prouve l'erreur de compilation sans lever d'exception à l'exécution.
    const attemptWrite = (): void => {
      // @ts-expect-error monthKey est en lecture seule
      service.monthKey.set('2026-05');
    };

    expect('set' in service.monthKey).toBe(false);
  });
});
