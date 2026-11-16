import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { MOCK_RECURRING_RULES } from '../mocks/mock-recurring-rules';
import { MonthContextService } from './month-context';
import { RecurringRuleService } from './recurring-rule';

describe('RecurringRuleService', () => {
  let service: RecurringRuleService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16));
    service = new RecurringRuleService(new MonthContextService());
  });

  afterEach(() => vi.useRealTimers());

  describe('rules()', () => {
    it('should expose the four mock rules in order', () => {
      expect(service.rules().map(rule => rule.id)).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
    });

    it('should expose stable series ids for the mock rules', () => {
      expect(service.rules().map(rule => rule.seriesId)).toEqual([
        'series-1',
        'series-2',
        'series-3',
        'series-4',
      ]);
    });

    it('should create a new series starting in the next system month', () => {
      service.createRule({
        label: 'Assurance',
        categoryId: 'cat-2',
        subcategoryId: 'sub-2',
        amountCents: 12500,
      });

      const created = service.rules().at(-1);

      expect(created).toEqual(
        expect.objectContaining({
          label: 'Assurance',
          amountCents: 12500,
          startMonth: '2026-12',
          active: true,
        }),
      );
      expect(created?.id).toEqual(expect.any(String));
      expect(created?.seriesId).toEqual(expect.any(String));
      expect(created?.seriesId).not.toBe(created?.id);
      expect(service.activeRulesForMonth('2026-11').some(rule => rule.label === 'Assurance')).toBe(false);
      expect(service.activeRulesForMonth('2026-12').some(rule => rule.label === 'Assurance')).toBe(true);
    });

    it.each([0, -1, 85000.5, Number.MAX_SAFE_INTEGER + 1])(
      'should reject an invalid recurring amount when creating a rule (%s)',
      amountCents => {
        expect(() =>
          service.createRule({
            label: 'Montant invalide',
            categoryId: 'cat-2',
            subcategoryId: 'sub-2',
            amountCents,
          }),
        ).toThrow('Invalid recurring rule amount');
      },
    );

    it('should plan an edit as a successor without mutating the existing version', () => {
      const before = service.rules();

      const change = service.planVersionChange('rule-1', { amountCents: 250000 });

      expect(change.closedVersion).toEqual(expect.objectContaining({ id: 'rule-1', endMonth: '2026-11' }));
      expect(change.nextVersion).toEqual(
        expect.objectContaining({
          seriesId: 'series-1',
          amountCents: 250000,
          startMonth: '2026-12',
          active: true,
        }),
      );
      expect(change.nextVersion.id).not.toBe('rule-1');
      expect(service.rules()).toEqual(before);
      expect(service.activeRulesForMonth('2026-11').find(rule => rule.seriesId === 'series-1')?.amountCents).toBe(245000);
      expect(service.activeRulesForMonth('2026-12').find(rule => rule.seriesId === 'series-1')?.amountCents).toBe(245000);
    });

    it('should reject an invalid amount in a version patch', () => {
      expect(() => service.planVersionChange('rule-1', { amountCents: 0 })).toThrow(
        'Invalid recurring rule amount',
      );
    });

    it('should commit a successor while retaining the inclusive historical version', () => {
      const change = service.planVersionChange('rule-1', { amountCents: 250000 });

      service.commitVersionChange(change);

      expect(service.activeRulesForMonth('2026-11').find(rule => rule.seriesId === 'series-1')?.amountCents).toBe(245000);
      expect(service.activeRulesForMonth('2026-12').find(rule => rule.seriesId === 'series-1')?.amountCents).toBe(250000);
      expect(service.rules().filter(rule => rule.seriesId === 'series-1')).toHaveLength(2);
    });

    it('should replace an unstarted successor when it is edited again', () => {
      const firstChange = service.planVersionChange('rule-1', { amountCents: 250000 });
      service.commitVersionChange(firstChange);

      const futureVersion = firstChange.nextVersion;
      const secondChange = service.planVersionChange(futureVersion.id, { amountCents: 255000 });
      service.commitVersionChange(secondChange);

      expect(service.rules().filter(rule => rule.seriesId === 'series-1')).toHaveLength(2);
      expect(service.activeRulesForMonth('2026-12').find(rule => rule.seriesId === 'series-1')?.amountCents).toBe(255000);
    });

    it('should version deactivation and allow reactivation before the successor starts', () => {
      const deactivation = service.planVersionChange('rule-1', { active: false });
      service.commitVersionChange(deactivation);

      expect(service.activeRulesForMonth('2026-11').some(rule => rule.seriesId === 'series-1')).toBe(true);
      expect(service.activeRulesForMonth('2026-12').some(rule => rule.seriesId === 'series-1')).toBe(false);

      const reactivation = service.planVersionChange(deactivation.nextVersion.id, { active: true });
      service.commitVersionChange(reactivation);

      expect(service.activeRulesForMonth('2026-12').find(rule => rule.seriesId === 'series-1')?.active).toBe(true);
      expect(service.rules().filter(rule => rule.seriesId === 'series-1')).toHaveLength(2);
    });
  });

  describe('activeRulesForMonth()', () => {
    it('should return rule-1, rule-2 and rule-3 for 2026-07', () => {
      expect(service.activeRulesForMonth('2026-07').map(rule => rule.id)).toEqual(['rule-1', 'rule-2', 'rule-3']);
    });

    it('should include rule-3 in 2026-09 (endMonth is inclusive)', () => {
      expect(service.activeRulesForMonth('2026-09').map(rule => rule.id)).toEqual(['rule-1', 'rule-2', 'rule-3']);
    });

    it('should exclude rule-3 from 2026-10 (rule ended)', () => {
      expect(service.activeRulesForMonth('2026-10').map(rule => rule.id)).toEqual(['rule-1', 'rule-2']);
    });

    it('should return an empty list before startMonth', () => {
      expect(service.activeRulesForMonth('2026-06')).toEqual([]);
    });

    it.each(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'])(
      'should never return the inactive rule-4 for %s',
      (monthKey: string) => {
        expect(service.activeRulesForMonth(monthKey).some(rule => rule.id === 'rule-4')).toBe(false);
      },
    );

    it.each(['2026-13', '2026-7', ''])('should reject invalid monthKey "%s"', (monthKey: string) => {
      expect(() => service.activeRulesForMonth(monthKey)).toThrow('Invalid month key format');
    });

    it('should return a new array that does not affect rules()', () => {
      const active = service.activeRulesForMonth('2026-07');
      active.pop();

      expect(service.rules()).toHaveLength(MOCK_RECURRING_RULES.length);
      expect(service.activeRulesForMonth('2026-07')).toHaveLength(3);
    });
  });

  describe('Mock data', () => {
    it('should store integer cent amounts for every mock', () => {
      MOCK_RECURRING_RULES.forEach(rule => expect(Number.isInteger(rule.amountCents)).toBe(true));
    });
  });
});
