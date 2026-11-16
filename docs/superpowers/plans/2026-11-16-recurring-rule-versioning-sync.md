# Recurring Rule Versioning and Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Version recurring rules from the next system month and optionally synchronize already-prepared months without overwriting manual edits or zero-cleared lines.

**Architecture:** `MonthContextService` exposes the system month and its successor independently of the selected month. `RecurringRuleService` owns rule versions; `BudgetService` coordinates prevalidation and atomic synchronization of generated budget lines and per-month suppression markers. Creating a new rule is future-only and never offers retroactive synchronization.

**Tech Stack:** Angular 22, TypeScript strict, signals, Vitest, integer-cent money model.

**Spec:** `.ai/tasks/active/TASK-019-recurring-rule-versioning-sync.md`

## Global Constraints
- Services alone access mocks; components do not import mock data.
- Amounts remain safe integer cents; aggregate math uses `BigInt` where totals are combined.
- A recurrence never creates a transaction.
- No new npm package, `any`, or type assertion.
- Mutations spanning rules, prepared budget lines, and suppression markers are all-or-nothing.
- New rules start at the system month following the current system month; selected month does not affect the start.
- Existing rule edits may synchronize all prepared months in the series' affected history; manual lines and zero-clear suppressions are preserved.
- Do not commit or push without explicit authorization for this task.

## Review Focus
- Manual line edits must detach from rule provenance and survive sync; cover in Task 3.
- A zero-cleared generated line must not be recreated by sync; cover in Task 3.
- Any aggregate overflow must leave rule versions, lines, and suppressions unchanged; cover in Task 3.
- December/January system-month transitions must ignore the selected month; cover in Task 1.
- Multiple active rules for one subcategory must never create duplicate month lines; cover in Task 2 and preserve the existing first-valid-rule behavior in Task 3.

---

### Task 1: Expose the next system month

**Files:**
- Modify: `src/app/services/month-context.ts`
- Test: `src/app/services/month-context.spec.ts`

**Interfaces:**
- Produces: readonly `systemMonthKey: string` and `nextSystemMonthKey: string`; `monthKey()` remains the selected-month signal.

- [x] Add a failing test that fixes system time to December 2026, selects a different month, and expects `systemMonthKey === '2026-12'` and `nextSystemMonthKey === '2027-01'`.
- [x] Run `npx ng test --no-watch --include=src/app/services/month-context.spec.ts`; confirm the new property is missing.
- [x] Expose the existing system-month value read-only and derive the next month with the same validated `YYYY-MM` arithmetic used by `shiftMonth`.
- [x] Run the focused spec and confirm the boundary test passes, including a non-boundary month case.

### Task 2: Add versioned rule mutations

**Files:**
- Modify: `src/app/models/recurring-rule.ts`
- Modify: `src/app/mocks/mock-recurring-rules.ts`
- Modify: `src/app/services/recurring-rule.ts`
- Modify: `src/app/services/budget.spec.ts`
- Modify: `src/app/pages/budget-mensuel/budget-mensuel.spec.ts`
- Test: `src/app/services/recurring-rule.spec.ts`

**Interfaces:**
- Add `seriesId` to `RecurringRule`; each existing mock starts as a one-version series whose initial `seriesId` is stable.
- Add typed `RecurringRuleInput`, `RecurringRulePatch`, and `RecurringRuleVersionChange` shapes.
- `createRule(input: RecurringRuleInput): RecurringRule` creates a new series starting at `nextSystemMonthKey`; it never mutates prepared budgets.
- `planVersionChange(ruleId: string, patch: RecurringRulePatch): RecurringRuleVersionChange` proposes a successor without mutating state; `active` is part of the patch for disable/reactivate operations.
- `commitVersionChange(change: RecurringRuleVersionChange): void` commits a previously planned version transition. Repeated edits to an unstarted next-month version replace that successor rather than accumulating ineffective future versions.

- [x] Add failing tests for new-series identity/start month, successor version identity and shared `seriesId`, old version's inclusive end month, no mutation during planning, and rejection of invalid amounts.
- [x] Run the focused recurring-rule spec; confirm failures are about missing version fields/APIs.
- [x] Implement version creation, planning, and commit using signals; represent deactivation as an inactive successor and reactivation as a new active successor.
- [x] Run the focused recurring-rule spec and confirm versioning and range-boundary tests pass.

Ruling: add `seriesId` to existing BudgetService and Budget Mensuel test fixtures and inject `MonthContextService` in the BudgetService fixture — required to keep all strict TypeScript fixtures complete after making the series identity mandatory.

### Task 3: Preserve exceptions and synchronize prepared months atomically

**Files:**
- Create: `src/app/models/recurring-rule-suppression.ts`
- Modify: `src/app/services/budget.ts`
- Test: `src/app/services/budget.spec.ts`

**Interfaces:**
- `RecurringRuleSuppression` records `monthKey`, `seriesId`, and `subcategoryId` for a rule-generated line deliberately cleared to zero.
- `BudgetService.applyRecurringRuleVersionChange(change: RecurringRuleVersionChange, synchronizePreparedMonths: boolean): void` coordinates rule commit, line changes, and suppressions.
- `BudgetService.setPlannedAmount` clears `sourceRuleId` when a generated line is manually changed; setting it to zero records a suppression for its series. A later positive manual entry clears that suppression.

- [x] Add failing tests for: edited generated lines detach and survive synchronization; zero-cleared lines remain absent after synchronization; a later positive manual entry clears the zero suppression; synchronization skips unprepared months; a new rule cannot be included in retroactive synchronization; and declining synchronization leaves prepared budgets unchanged.
- [x] Add a failing test where a multi-month sync exceeds a safe category/month aggregate and assert rule versions, lines, and suppressions are byte-for-byte unchanged.
- [x] Run the focused budget spec and confirm the new behavioral assertions fail for the expected reasons.
- [x] Implement candidate line and suppression changes without mutation; prevalidate every affected month/category using safe aggregate guards; only then commit the rule transition and all prepared-budget signals.
- [x] Keep `openMonth` idempotent and skip any rule occurrence recorded as suppressed; preserve one line per month/subcategory and the current first-valid-rule behavior when rules overlap.
- [x] Run the focused budget spec and confirm preservation, future-only creation, and atomic overflow tests pass.

### Task 4: Full verification

**Files:**
- No additional source files.

- [x] Run `npx tsc -p tsconfig.app.json --noEmit` and `npx tsc -p tsconfig.spec.json --noEmit`; both exit 0.
- [x] Run `npx ng test --no-watch`; the full Vitest suite passes with no failures.
- [x] Run `npm run build`; production build succeeds, noting any SCSS budget warnings without expanding scope.
- [x] Run `git diff --check`; no whitespace errors.
- [x] Review the final diff to ensure only TASK-019 files changed; leave TASK-020 UI for its dependent task.
