import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetService } from '../../../services/budget';
import { MonthContextService } from '../../../services/month-context';
import { RecurringRuleService } from '../../../services/recurring-rule';
import { SettingsService } from '../../../services/settings';
import { RecurringRuleManager } from './recurring-rule-manager';
import type { SelectFieldOption } from '../select-field/select-field';

const TRANSLATIONS = {
  fr: {
    modal: { close: 'Fermer' },
    budgetMensuel: {
      recurringRules: {
        trigger: 'Gérer les règles récurrentes',
        title: 'Règles récurrentes',
        createTitle: 'Nouvelle règle',
        editTitle: 'Modifier la règle',
        label: 'Libellé',
        category: 'Catégorie',
        categoryPlaceholder: 'Choisir une catégorie',
        subcategory: 'Sous-catégorie',
        subcategoryPlaceholder: 'Choisir une sous-catégorie',
        amount: 'Montant',
        dayOfMonth: 'Jour du mois',
        endMonth: 'Fin de période (facultative)',
        noEnd: 'Aucune fin',
        listLabel: 'Règles récurrentes',
        fromMonthFuture: 'À partir de {{month}}',
        fromMonthCurrent: 'Depuis {{month}}',
        toMonth: 'jusqu’à {{month}}',
        existingRules: 'Règles existantes',
        effectiveDateBefore: 'Cette règle prendra effet',
        effectiveDateFrom: 'à partir de {{month}}',
        effectiveDateTo: 'jusqu’à {{month}}',
        add: 'Ajouter la règle',
        save: 'Enregistrer les modifications',
        cancel: 'Annuler',
        actions: 'Actions pour {{name}}',
        edit: 'Modifier',
        activate: 'Réactiver',
        deactivate: 'Désactiver',
        active: 'Active',
        inactive: 'Inactive',
        scheduled: 'À venir',
        ended: 'Terminée',
        syncTitle: 'Synchroniser les mois déjà préparés ?',
        sync: 'Synchroniser les mois préparés',
        futureOnly: 'Appliquer à partir de {{month}}',
        amountInvalid: 'Saisissez un montant supérieur à zéro, avec deux décimales maximum.',
        dayInvalid: 'Le jour doit être compris entre 1 et 31.',
        endMonthInvalid: 'La fin doit être égale ou postérieure à {{month}}.',
        aggregateOverflow: 'La synchronisation dépasserait la capacité de calcul exacte.',
        ruleInvalid: 'Vérifiez les informations de la règle.',
      },
    },
  },
  en: {
    modal: { close: 'Close' },
    budgetMensuel: {
      recurringRules: {
        trigger: 'Manage recurring rules',
        title: 'Recurring rules',
        createTitle: 'New rule',
        editTitle: 'Edit rule',
        label: 'Label',
        category: 'Category',
        categoryPlaceholder: 'Choose a category',
        subcategory: 'Subcategory',
        subcategoryPlaceholder: 'Choose a subcategory',
        amount: 'Amount',
        dayOfMonth: 'Day of month',
        endMonth: 'End month (optional)',
        noEnd: 'No end',
        listLabel: 'Recurring rules',
        fromMonthFuture: 'From {{month}}',
        fromMonthCurrent: 'Since {{month}}',
        toMonth: 'through {{month}}',
        existingRules: 'Existing rules',
        effectiveDateBefore: 'This rule takes effect',
        effectiveDateFrom: 'from {{month}}',
        effectiveDateTo: 'through {{month}}',
        add: 'Add rule',
        save: 'Save changes',
        cancel: 'Cancel',
        actions: 'Actions for {{name}}',
        edit: 'Edit',
        activate: 'Reactivate',
        deactivate: 'Deactivate',
        active: 'Active',
        inactive: 'Inactive',
        scheduled: 'Scheduled',
        ended: 'Ended',
        syncTitle: 'Synchronize prepared months?',
        sync: 'Synchronize prepared months',
        futureOnly: 'Apply from {{month}}',
        amountInvalid: 'Enter an amount greater than zero with at most two decimals.',
        dayInvalid: 'The day must be between 1 and 31.',
        endMonthInvalid: 'The end month must be {{month}} or later.',
        aggregateOverflow: 'Synchronization would exceed the exact calculation limit.',
        ruleInvalid: 'Check the rule details.',
      },
    },
  },
};

describe('RecurringRuleManager', () => {
  let fixture: ComponentFixture<RecurringRuleManager>;
  let recurringRuleService: RecurringRuleService;
  let budgetService: BudgetService;
  let monthContext: MonthContextService;
  let settingsService: SettingsService;

  function element<T extends HTMLElement>(selector: string): T {
    const found = fixture.nativeElement.querySelector(selector) as T | null;
    if (!found) throw new Error(`Missing element: ${selector}`);
    return found;
  }

  function setValue(selector: string, value: string): void {
    const control = element<HTMLInputElement | HTMLSelectElement>(selector);
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  function stubVisibleBottom(panelBottom: number, menuHeight: number): void {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(menuHeight);
    vi.spyOn(element<HTMLElement>('.panel'), 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: panelBottom,
    } as DOMRect);
  }

  function click(selector: string): void {
    if (selector === '[data-action="open-manager"]') {
      fixture.componentRef.setInput('opened', true);
      fixture.detectChanges();
      return;
    }
    if (selector === '[data-action="save-rule"]') {
      element<HTMLFormElement>('.rule-create').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      return;
    }
    element<HTMLElement>(selector).click();
    fixture.detectChanges();
  }

  function pickEndMonth(monthKey: string): void {
    click('#recurring-rule-end-month');
    click('.picker-title');
    click(`[data-key="${monthKey.slice(0, 4)}"]`);
    click(`[data-key="${monthKey}"]`);
  }

  function setFormValue(control: 'categoryId' | 'subcategoryId', value: string): void {
    fixture.componentInstance['form'].controls[control].setValue(value);
    fixture.detectChanges();
  }

  function fillNewRule(amount = '125.00', day = '', endMonth = ''): void {
    setValue('#recurring-rule-label', 'Assurance');
    setFormValue('categoryId', 'cat-3');
    setFormValue('subcategoryId', 'sub-5');
    setValue('#recurring-rule-amount', amount);
    setValue('#recurring-rule-day', day);
    if (endMonth) pickEndMonth(endMonth);
  }

  function addVersion(seriesId: string, amountCents: number): void {
    const rule = recurringRuleService.rules().find(item => item.seriesId === seriesId);
    if (!rule) throw new Error(`Missing series ${seriesId}`);
    budgetService.applyRecurringRuleVersionChange(recurringRuleService.planVersionChange(rule.id, { amountCents }), false);
  }

  async function createFixture(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        RecurringRuleManager,
        TranslocoTestingModule.forRoot({
          langs: TRANSLATIONS,
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    recurringRuleService = TestBed.inject(RecurringRuleService);
    budgetService = TestBed.inject(BudgetService);
    monthContext = TestBed.inject(MonthContextService);
    settingsService = TestBed.inject(SettingsService);
    settingsService.updateSettings({ locale: 'fr-FR' });
    fixture = TestBed.createComponent(RecurringRuleManager);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 16));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('places the creation form before a scrollable list and names the dialog', async () => {
    await createFixture();
    click('[data-action="open-manager"]');

    const form = element<HTMLElement>('.rule-create');
    const list = element<HTMLElement>('.rule-list');
    const dialog = element<HTMLElement>('[role="dialog"]');

    expect(form.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(list.classList.contains('rule-list')).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('app-modal-title');
    expect(element<HTMLElement>('#app-modal-title').textContent?.trim()).toBe('Règles récurrentes');
    expect(element<HTMLElement>('.effective-date').textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Cette règle prendra effet à partir de décembre 2026.',
    );
  });

  it('formats the effective month using the current settings locale', async () => {
    await createFixture();
    monthContext.setMonth('2035-02');
    settingsService.updateSettings({ locale: 'en-US' });
    TestBed.inject(TranslocoService).setActiveLang('en');
    click('[data-action="open-manager"]');

    expect(element<HTMLElement>('.effective-date').textContent).toContain('December 2026');
    expect(monthContext.monthKey()).not.toBe(monthContext.nextSystemMonthKey);
  });

  it('filters subcategories by category and clears an obsolete selection', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    setFormValue('categoryId', 'cat-1');

    const options: SelectFieldOption[] = fixture.componentInstance['subcategoryOptions']();
    expect(options.map(option => option.value)).toEqual(['sub-1']);
  });

  it('gives each row action disclosure an accessible rule-specific name', async () => {
    await createFixture();
    click('[data-action="open-manager"]');

    expect(element<HTMLElement>('[data-action="row-actions-series-1"]').getAttribute('aria-label')).toBe(
      'Actions pour Salaire mensuel',
    );
  });

  it('keeps only one version history expanded at a time', async () => {
    await createFixture();
    addVersion('series-2', 90000);
    addVersion('series-4', 12000);
    click('[data-action="open-manager"]');
    click('[data-action="history-series-2"]');
    click('[data-action="history-series-4"]');

    expect(fixture.nativeElement.querySelectorAll('.rule-summary[aria-expanded="true"]')).toHaveLength(1);
    expect(element<HTMLElement>('[data-action="history-series-2"]').getAttribute('aria-expanded')).toBe('false');
    expect(element<HTMLElement>('[data-action="history-series-4"]').getAttribute('aria-expanded')).toBe('true');
  });

  it('marks the category and subcategory invalid when a rule is refused without them, then clears them', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    setValue('#recurring-rule-label', 'Assurance');
    setValue('#recurring-rule-amount', '125.00');
    click('[data-action="save-rule"]');

    expect(element('#recurring-rule-category').getAttribute('aria-invalid')).toBe('true');
    expect(element('#recurring-rule-subcategory').getAttribute('aria-invalid')).toBe('true');

    setFormValue('categoryId', 'cat-3');
    setFormValue('subcategoryId', 'sub-5');

    expect(element('#recurring-rule-category').hasAttribute('aria-invalid')).toBe(false);
    expect(element('#recurring-rule-subcategory').hasAttribute('aria-invalid')).toBe(false);
  });

  it('does not mark the category invalid before a save is attempted', async () => {
    await createFixture();
    click('[data-action="open-manager"]');

    expect(element('#recurring-rule-category').hasAttribute('aria-invalid')).toBe(false);
  });

  it('starts closed and emits a close event when the dialog is dismissed', async () => {
    await createFixture();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

    click('[data-action="open-manager"]');
    click('.close-btn');

    expect(closed).toHaveBeenCalledOnce();
  });

  it('creates a future-only rule with an optional inclusive end month and no retroactive synchronization', async () => {
    await createFixture();
    monthContext.setMonth('2035-02');
    budgetService.openMonth('2026-07');
    const linesBefore = budgetService.lines();
    const rulesBefore = recurringRuleService.rules().length;

    click('[data-action="open-manager"]');
    fillNewRule('125.00', '', '2027-02');
    click('[data-action="save-rule"]');

    const createdRule = recurringRuleService.rules().at(-1);
    expect(recurringRuleService.rules()).toHaveLength(rulesBefore + 1);
    expect(createdRule).toEqual(
      expect.objectContaining({ startMonth: '2026-12', endMonth: '2027-02', amountCents: 12500 }),
    );
    expect(budgetService.lines()).toBe(linesBefore);
    expect(fixture.nativeElement.querySelector('.sync-choice')).toBeNull();
    expect(
      fixture.nativeElement
        .querySelector(`[data-series-id="${createdRule?.seriesId}"] .rule-period`)
        ?.textContent?.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('À partir de décembre 2026 jusqu’à février 2027');
  });

  it('accepts day 31 and keeps the optional day unset when omitted', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    fillNewRule('125.00', '31');
    click('[data-action="save-rule"]');

    expect(recurringRuleService.rules().at(-1)?.dayOfMonth).toBe(31);

    fillNewRule('50.00');
    click('[data-action="save-rule"]');
    expect(recurringRuleService.rules().at(-1)?.dayOfMonth).toBeUndefined();
  });

  it('rejects invalid amount and day values without creating a rule', async () => {
    await createFixture();
    const countBefore = recurringRuleService.rules().length;
    click('[data-action="open-manager"]');
    fillNewRule('0', '32');
    click('[data-action="save-rule"]');

    expect(recurringRuleService.rules()).toHaveLength(countBefore);
    expect(fixture.nativeElement.textContent).toContain('Saisissez un montant supérieur à zéro');
    expect(fixture.nativeElement.textContent).toContain('Le jour doit être compris entre 1 et 31.');
  });

  it('orders the creation fields from category to amount before the optional end', async () => {
    await createFixture();
    click('[data-action="open-manager"]');

    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.rule-form-grid .form-field > label') as NodeListOf<HTMLLabelElement>,
    ).map(label => label.textContent?.trim());
    expect(labels).toEqual(['Catégorie', 'Sous-catégorie', 'Libellé', 'Montant', 'Jour du mois', 'Fin de période (facultative)']);
  });

  it('disables end months before the fixed effective month in the picker', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    click('#recurring-rule-end-month');
    click('.picker-title');
    click('[data-key="2026"]');

    expect(element<HTMLElement>('[data-key="2026-11"]').getAttribute('aria-disabled')).toBe('true');
    expect(element<HTMLElement>('[data-key="2026-12"]').getAttribute('aria-disabled')).toBeNull();
  });

  it('rejects an end month before the fixed effective month', async () => {
    await createFixture();
    const countBefore = recurringRuleService.rules().length;
    click('[data-action="open-manager"]');
    fillNewRule('125.00');
    fixture.componentInstance['onEndMonthInput']('2026-11');
    fixture.detectChanges();
    click('[data-action="save-rule"]');

    expect(recurringRuleService.rules()).toHaveLength(countBefore);
    expect(fixture.nativeElement.textContent).toContain('La fin doit être égale ou postérieure à décembre 2026.');
  });

  it('cancels rule editing without mutating the version list', async () => {
    await createFixture();
    const rulesBefore = recurringRuleService.rules();
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-1"]');
    click('[data-action="edit-series-1"]');
    setValue('#recurring-rule-amount', '2500.00');
    click('[data-action="cancel-edit"]');

    expect(recurringRuleService.rules()).toBe(rulesBefore);
    expect(fixture.nativeElement.querySelector('[data-action="save-rule"]')).not.toBeNull();
  });

  it('shows synchronization choices only for an existing prepared series', async () => {
    await createFixture();
    budgetService.openMonth('2026-07');
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-1"]');
    click('[data-action="edit-series-1"]');
    setValue('#recurring-rule-amount', '2500.00');
    click('[data-action="save-rule"]');

    expect(element<HTMLElement>('.sync-choice').textContent).toContain('Synchroniser les mois déjà préparés ?');
    expect(fixture.nativeElement.querySelector('[data-action="sync-prepared"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-action="future-only"]')).not.toBeNull();
  });

  it('applies an existing series edit immediately when there are no prepared occurrences', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-2"]');
    click('[data-action="edit-series-2"]');
    setValue('#recurring-rule-amount', '900.00');
    click('[data-action="save-rule"]');

    expect(fixture.nativeElement.querySelector('.sync-choice')).toBeNull();
    expect(recurringRuleService.activeRulesForMonth('2026-12').find(rule => rule.seriesId === 'series-2')?.amountCents).toBe(90000);
  });

  it('applies an existing series change only from the effective month when synchronization is declined', async () => {
    await createFixture();
    budgetService.openMonth('2026-07');
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-2"]');
    click('[data-action="edit-series-2"]');
    setValue('#recurring-rule-amount', '900.00');
    click('[data-action="save-rule"]');
    click('[data-action="future-only"]');

    expect(budgetService.plannedCentsFor('2026-07', 'sub-2')).toBe(85000);
    expect(recurringRuleService.activeRulesForMonth('2026-12').find(rule => rule.seriesId === 'series-2')?.amountCents).toBe(90000);
  });

  it('synchronizes generated months while preserving a manual amount and a zero-cleared occurrence', async () => {
    await createFixture();
    budgetService.openMonth('2026-07');
    budgetService.openMonth('2026-08');
    budgetService.openMonth('2026-09');
    budgetService.setPlannedAmount('2026-07', 'sub-2', 91000);
    budgetService.setPlannedAmount('2026-09', 'sub-2', 0);

    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-2"]');
    click('[data-action="edit-series-2"]');
    setValue('#recurring-rule-amount', '900.00');
    click('[data-action="save-rule"]');
    click('[data-action="sync-prepared"]');

    expect(budgetService.plannedCentsFor('2026-07', 'sub-2')).toBe(91000);
    expect(budgetService.plannedCentsFor('2026-08', 'sub-2')).toBe(90000);
    expect(budgetService.plannedCentsFor('2026-09', 'sub-2')).toBe(0);
    expect(budgetService.recurringRuleSuppressions()).toContainEqual({
      monthKey: '2026-09',
      seriesId: 'series-2',
      subcategoryId: 'sub-2',
    });
  });

  it('versions rule deactivation and reactivation without deleting the series history', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-4"]');
    click('[data-action="activate-series-4"]');
    expect(recurringRuleService.activeRulesForMonth('2026-12').some(rule => rule.seriesId === 'series-4')).toBe(true);

    click('[data-action="row-actions-series-4"]');
    click('[data-action="deactivate-series-4"]');

    expect(recurringRuleService.activeRulesForMonth('2026-12').some(rule => rule.seriesId === 'series-4')).toBe(false);
    expect(recurringRuleService.rules().filter(rule => rule.seriesId === 'series-4')).toHaveLength(2);
  });

  it('retains the editor and shows an alert when synchronization exceeds aggregate capacity', async () => {
    await createFixture();
    budgetService.openMonth('2026-07');
    budgetService.setPlannedAmount('2026-07', 'sub-3', Number.MAX_SAFE_INTEGER - 85000);
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-2"]');
    click('[data-action="edit-series-2"]');
    setValue('#recurring-rule-amount', '1000.00');
    click('[data-action="save-rule"]');
    click('[data-action="sync-prepared"]');

    expect(fixture.nativeElement.querySelector('#recurring-rule-error')?.textContent?.trim()).toBe(
      'La synchronisation dépasserait la capacité de calcul exacte.',
    );
    expect(element<HTMLInputElement>('#recurring-rule-amount').value).toBe('1000.00');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('shows the history disclosure only for rules with several versions', async () => {
    await createFixture();
    addVersion('series-2', 90000);
    click('[data-action="open-manager"]');

    expect(element<HTMLElement>('[data-series-id="series-1"] .rule-summary').tagName).toBe('DIV');
    expect(element<HTMLElement>('[data-series-id="series-2"] .rule-summary').tagName).toBe('BUTTON');
  });

  it('hides Modifier for an ended rule and offers Reactiver', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-3"]');

    expect(fixture.nativeElement.querySelector('[data-action="edit-series-3"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-action="activate-series-3"]')).not.toBeNull();
  });

  it('opens one menu at a time', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-1"]');
    click('[data-action="row-actions-series-2"]');

    expect(fixture.nativeElement.querySelectorAll('.row-menu-panel')).toHaveLength(1);
    expect(element<HTMLElement>('[data-series-id="series-2"] .row-menu-panel')).not.toBeNull();
  });

  it('closes the menu with Escape and returns focus to its trigger', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-1"]');
    element<HTMLElement>('.row-menu-panel').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.row-menu-panel')).toBeNull();
    expect(document.activeElement).toBe(element<HTMLElement>('[data-action="row-actions-series-1"]'));
  });

  it('moves focus through the menu items with arrow, Home and End keys', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    element<HTMLElement>('[data-action="row-actions-series-1"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 0 }),
    );
    fixture.detectChanges();
    TestBed.tick();

    const items = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.row-menu-panel [role="menuitem"]'));
    expect(items).toHaveLength(2);
    expect(document.activeElement).toBe(items[0]);
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
  });

  it('closes the menu on a press outside it', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-1"]');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.row-menu-panel')).toBeNull();
  });

  it('opens the menu upward when there is no room below the trigger', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    stubVisibleBottom(800, 120);
    vi.spyOn(element<HTMLElement>('[data-action="row-actions-series-1"]'), 'getBoundingClientRect').mockReturnValue({
      top: 700,
      bottom: 744,
    } as DOMRect);
    click('[data-action="row-actions-series-1"]');
    TestBed.tick();

    expect(element<HTMLElement>('.row-menu-panel').classList).toContain('row-menu-panel-above');
  });

  it('keeps the menu below the trigger when there is room', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    stubVisibleBottom(800, 120);
    vi.spyOn(element<HTMLElement>('[data-action="row-actions-series-1"]'), 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 144,
    } as DOMRect);
    click('[data-action="row-actions-series-1"]');
    TestBed.tick();

    expect(element<HTMLElement>('.row-menu-panel').classList).not.toContain('row-menu-panel-above');
  });

  it('moves focus to the label field after choosing Modifier from the menu', async () => {
    await createFixture();
    click('[data-action="open-manager"]');
    click('[data-action="row-actions-series-1"]');
    click('[data-action="edit-series-1"]');
    TestBed.tick();

    expect(document.activeElement?.id).toBe('recurring-rule-label');
  });
});
