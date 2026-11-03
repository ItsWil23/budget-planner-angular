import { describe, it, expect, beforeEach } from 'vitest';
import { MOCK_RECURRING_RULES } from '../mocks/mock-recurring-rules';
import { RecurringRuleService } from './recurring-rule';

describe('RecurringRuleService', () => {
  let service: RecurringRuleService;

  beforeEach(() => {
    service = new RecurringRuleService();
  });

  describe('rules()', () => {
    it('should expose the four mock rules in order', () => {
      expect(service.rules().map(rule => rule.id)).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
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
