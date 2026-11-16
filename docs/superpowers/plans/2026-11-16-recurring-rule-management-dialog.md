# Recurring Rule Management Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible French/English recurring-rule manager to Budget Mensuel with future-only creation and an explicit synchronization choice when editing existing prepared rule series.

**Architecture:** Extend the existing projected-content `Modal` compatibly with dialog semantics, Escape handling, focus entry/trapping/restoration, and an accessible title. Add a standalone `RecurringRuleManager` UI component that consumes `RecurringRuleService`, `BudgetService`, `CategoryService`, `MonthContextService`, `MoneyService`, and `SettingsService`; mount it on Budget Mensuel. Keep all rule and budget mutations inside the existing services.

**Tech Stack:** Angular 22 standalone, signals, typed Reactive Forms, Transloco, SCSS design tokens, Vitest.

**Spec:** `.ai/tasks/active/TASK-020-recurring-rule-management-dialog.md`

## Global Constraints
- Services alone access mocks; UI components never import mock data.
- Amount input is parsed by `MoneyService.parseEurosInput`; stored values are positive safe integer cents.
- A new rule begins at `MonthContextService.nextSystemMonthKey` and never offers retroactive synchronization.
- A new version may have an optional inclusive `endMonth`, which must be on or after its fixed system-next start month; `startMonth` itself is not editable.
- Existing series edits call `RecurringRuleService.planVersionChange` and `BudgetService.applyRecurringRuleVersionChange`; synchronize only if the user chooses and prepared occurrences exist.
- Preserve manual amounts and zero-cleared occurrences as defined by TASK-019; never create transactions.
- All visible strings are localized in French and English; no hard-coded visible template text.
- Reuse design tokens; mobile first; no hover-only action and no new npm dependency.
- No commit or push without explicit authorization for TASK-020.
- Place the recurring-rule entry point inside the preparation card's existing actions; do not add a standalone page row or modify the shared topbar.
- The effective-date phrase is split into localized text and a strong accent-colored span; do not inject translated HTML.
- The complete modal panel scrolls; lock and restore document scrolling and contain touch overscroll within the modal.

## Review Focus
- Opening/closing the generic modal must restore focus without regressing the existing Transactions form; cover in Task 1.
- A selected category must constrain subcategory options and changing category must not submit an obsolete subcategory; cover in Task 2.
- Editing must not mutate before confirmation; cancel and dialog close leave services unchanged; cover in Task 2.
- Synchronization prompt must be absent for new rules and when no prepared occurrences exist; cover in Task 2.
- Synchronization overflow must keep the dialog, preserve form data, and show a localized error; cover in Task 2 using the real BudgetService.

---

### Task 1: Make the shared Modal accessible and compatible

**Files:**
- Modify: `src/app/components/ui/modal/modal.ts`
- Modify: `src/app/components/ui/modal/modal.html`
- Modify: `src/app/components/ui/modal/modal.scss`
- Test: `src/app/components/ui/modal/modal.spec.ts`
- Modify: `src/app/pages/transactions/transactions.html`

**Interfaces:**
- Add an optional `title: InputSignal<string | null>` and set a stable dialog title id when present; both current consumers provide a localized title.
- Preserve `closed: OutputEmitter<void>` and overlay-click behavior.
- Dialog panel exposes `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and programmatic focus; Escape emits `closed`.

- [x] Add failing Modal tests for dialog role/modal state/title association, heading-scale title, Escape emission, Tab focus containment, close-button accessible name, focus restoration, and background scroll lock/restore.
- [x] Run `npx ng test --no-watch --include=src/app/components/ui/modal/modal.spec.ts`; confirm missing background scroll lock behavior.
- [x] Implement heading-scale title/ARIA bindings, button type/label, Escape and Tab handling, initial focus, focus restoration, bounded full-panel scrolling, body/root scroll lock/restore, and overscroll containment while preserving existing close behavior.
- [x] Add the existing Transactions dialog title through `transactions.html` and extend its tests only as needed to verify the shared modal still closes and preserves the form flow.
- [x] Run focused Modal and Transactions specs; both pass.

### Task 2: Build the recurring-rule manager component

**Files:**
- Create: `src/app/components/ui/recurring-rule-manager/recurring-rule-manager.ts`
- Create: `src/app/components/ui/recurring-rule-manager/recurring-rule-manager.html`
- Create: `src/app/components/ui/recurring-rule-manager/recurring-rule-manager.scss`
- Test: `src/app/components/ui/recurring-rule-manager/recurring-rule-manager.spec.ts`
- Modify: `src/app/models/recurring-rule.ts`
- Modify: `src/app/services/recurring-rule.ts`

**Interfaces:**
- The component receives an `opened: InputSignal<boolean>` and emits `closed`; the page owns whether the dialog is open. It owns typed form state, selected series, pending `RecurringRuleVersionChange`, and synchronization choice.
- `RecurringRuleInput` accepts optional `endMonth`; `RecurringRulePatch` can set or clear it. The service validates inclusive end month >= the fixed system-next start month.
- It consumes `RecurringRuleService.createRule`, `rules`, `planVersionChange`, `commitVersionChange` only through `BudgetService.applyRecurringRuleVersionChange` for existing series changes, and `BudgetService.months`, `lines`, and `recurringRuleSuppressions` to detect prepared affected occurrences.
- It consumes `MonthContextService.nextSystemMonthKey` and `SettingsService.settings().locale` to show the localized effective month.

- [x] Add failing component tests for the create-first/full-modal-scroll structure, runtime FR/EN emphasized effective-month phrase, category/subcategory dependency, exact positive-cent amount validation, optional day range 1–31, and optional inclusive end-month field.
- [x] Add failing tests proving new-series creation calls `createRule` only, starts at the next system month, and never shows synchronization even when prior months are prepared.
- [x] Add failing tests for edit/cancel without mutation, version planning, one expanded series, system-relative « À partir de »/« Depuis » period copy, and confirmation states: show synchronization choices only when an existing series has prepared occurrences; choosing either option calls the service with `true` or `false` respectively.
- [x] Add failing tests that retain the form and show a localized alert after `PlannedAggregateOverflowError`; verify manual and zero-cleared occurrences remain respected by the real services.
- [x] Run the focused component spec and confirm the new component/behaviors are absent.
- [x] Implement the standalone component with a fixed next-system start and editable inclusive end month, creation form at the top, whole-modal scrolling, grouped version list, past versions read-only, single-open version disclosure, responsive desktop/mobile two-column rows, and accessible row actions for edit/disable/reactivate.
- [x] Keep confirmation in the same modal; commit an existing-series change immediately only when no prepared occurrence is affected, otherwise await one of the explicit choices.
- [x] Run the focused component spec and confirm all manager behavior tests pass.

Ruling: the optional day-of-month input uses `type="text"` with `inputmode="numeric"` and explicit 1–31 validation — HTML `type="number"` coerces an empty value to `null` and a populated value to `number`, conflicting with the typed string form and creating an uncaught `.trim()` failure.

### Task 3: Integrate the manager and localize all UI

**Files:**
- Modify: `src/app/pages/budget-mensuel/budget-mensuel.ts`
- Modify: `src/app/pages/budget-mensuel/budget-mensuel.html`
- Modify: `src/app/pages/budget-mensuel/budget-mensuel.scss`
- Modify: `src/app/components/ui/opening-balance/opening-balance.html`
- Modify: `src/app/components/ui/opening-balance/opening-balance.scss`
- Modify: `src/app/components/ui/opening-balance/opening-balance.ts`
- Modify: `public/i18n/fr.json`
- Modify: `public/i18n/en.json`
- Test: `src/app/pages/budget-mensuel/budget-mensuel.spec.ts`

**Interfaces:**
- Add the standalone manager to `BudgetMensuel.imports`, own its open state in the page, and render its dialog without changing budget calculations.
- The manager receives no mock data; it injects the typed services.

- [x] Add a failing Budget Mensuel integration test verifying the manager action is inside the preparation card action group and opens the named dialog.
- [x] Add/update the full `budgetMensuel.recurringRules` FR/EN translation subtree, including split effective-date emphasis and period/status labels.
- [x] Render the manager action from `OpeningBalance` inside its existing action group; let BudgetMensuel own the dialog open state. No extra page-level row or shared topbar changes.
- [x] Implement token-based responsive styles for the action group and the approved desktop/mobile row layouts; keep all amounts and categories visible without horizontal overflow.
- [x] Run the focused Budget Mensuel and manager specs in both FR and EN fixtures.

### Task 4: Full verification

**Files:**
- No additional source files.

- [x] Run `npx tsc -p tsconfig.app.json --noEmit` and `npx tsc -p tsconfig.spec.json --noEmit`; both exit 0.
- [x] Run `npx ng test --no-watch`; all 560 tests across 34 files pass.
- [x] Run `npm run build`; production build succeeds with two SCSS budget warnings, without expanding scope.
- [x] Run `git diff --check`; no whitespace errors.
- [x] Review the final working-tree paths; all modified and untracked files belong to TASK-020.

Verification ledger (2026-11-16, after the review refinements): both TypeScript checks passed; 35 test files / 571 tests passed; production build passed with the two pre-existing SCSS budget warnings (`budget-mensuel.scss`, `category-card.scss`); `git diff --check` passed. Refinements covered: "Récurrences" action first in the preparation card on one row at wide containers, permanent equation caption, field order, secondary "Existing rules" heading, name truncation on mobile, and the new `app-month-picker` (month and year grids) for the optional end month. No commit or push was made.
