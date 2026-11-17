import { computed, Component, DestroyRef, ElementRef, HostListener, Injector, afterNextRender, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { MoneyPipe } from '../money-pipe/money-pipe';
import { Modal } from '../modal/modal';
import { MonthPicker } from '../month-picker/month-picker';
import {
  RecurringRule,
  RecurringRuleInput,
  RecurringRulePatch,
  RecurringRuleVersionChange,
} from '../../../models/recurring-rule';
import { PlannedAggregateOverflowError, BudgetService } from '../../../services/budget';
import { CategoryService } from '../../../services/category';
import { MonthContextService } from '../../../services/month-context';
import { MoneyService } from '../../../services/money';
import { RecurringRuleService } from '../../../services/recurring-rule';
import { SettingsService } from '../../../services/settings';

interface RecurringRuleGroup {
  readonly seriesId: string;
  readonly latest: RecurringRule;
  readonly versions: readonly RecurringRule[];
  readonly categoryName: string;
  readonly subcategoryName: string;
}

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const CLIPPING_OVERFLOW = new Set(['auto', 'scroll', 'hidden', 'clip']);

@Component({
  selector: 'app-recurring-rule-manager',
  imports: [Modal, MonthPicker, MoneyPipe, NgTemplateOutlet, ReactiveFormsModule, TranslocoPipe],
  templateUrl: './recurring-rule-manager.html',
  styleUrl: './recurring-rule-manager.scss',
})
export class RecurringRuleManager {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly categoryService = inject(CategoryService);
  private readonly budget = inject(BudgetService);
  private readonly monthContext = inject(MonthContextService);
  private readonly moneyService = inject(MoneyService);
  private readonly ruleService = inject(RecurringRuleService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly settings = inject(SettingsService).settings;
  readonly opened = input(false);
  readonly closed = output<void>();
  protected readonly expandedSeriesId = signal<string | null>(null);
  protected readonly openMenuSeriesId = signal<string | null>(null);
  protected readonly menuPlacement = signal<'below' | 'above'>('below');
  protected readonly editingRuleId = signal<string | null>(null);
  protected readonly pendingChange = signal<RecurringRuleVersionChange | null>(null);
  protected readonly syncChoice = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly amountErrorKey = signal<string | null>(null);
  protected readonly dayErrorKey = signal<string | null>(null);
  protected readonly endMonthErrorKey = signal<string | null>(null);
  protected readonly endMonthDraft = signal('');
  protected readonly selectedCategoryId = signal('');
  protected readonly categories = this.categoryService.categories;
  protected readonly subcategories = computed(() =>
    this.categoryService.getSubcategoriesForCategory(this.selectedCategoryId()),
  );
  protected readonly effectiveMonthKey = this.monthContext.nextSystemMonthKey;
  protected readonly effectiveMonthLabel = computed(() => this.formatMonth(this.monthContext.nextSystemMonthKey));
  protected readonly ruleGroups = computed<RecurringRuleGroup[]>(() => {
    const grouped = new Map<string, RecurringRule[]>();
    for (const rule of this.ruleService.rules()) {
      const versions = grouped.get(rule.seriesId) ?? [];
      versions.push(rule);
      grouped.set(rule.seriesId, versions);
    }

    return [...grouped.entries()]
      .map(([seriesId, versions]) => {
        const orderedVersions = [...versions].sort((first, second) => first.startMonth.localeCompare(second.startMonth));
        const latest = orderedVersions[orderedVersions.length - 1];
        const categoryName = this.categoryService.categories().find(category => category.id === latest.categoryId)?.name ?? '';
        const subcategoryName = this.categoryService.subcategories().find(item => item.id === latest.subcategoryId)?.name ?? '';
        return { seriesId, latest, versions: orderedVersions, categoryName, subcategoryName };
      })
      .sort((first, second) => first.latest.label.localeCompare(second.latest.label));
  });

  protected readonly form = this.formBuilder.group({
    label: ['', Validators.required],
    categoryId: ['', Validators.required],
    subcategoryId: ['', Validators.required],
    amountText: ['', Validators.required],
    dayOfMonth: [''],
    endMonth: [''],
  });

  constructor() {
    this.form.controls.categoryId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(categoryId => {
      this.selectedCategoryId.set(categoryId);
      this.form.controls.subcategoryId.setValue('');
    });
    this.form.controls.endMonth.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(endMonth => {
      this.endMonthDraft.set(endMonth);
    });
  }

  protected closeManager(): void {
    this.resetForm();
    this.expandedSeriesId.set(null);
    this.openMenuSeriesId.set(null);
    this.closed.emit();
  }

  protected toggleSeries(seriesId: string): void {
    this.expandedSeriesId.update(current => current === seriesId ? null : seriesId);
  }

  protected toggleMenu(seriesId: string, event: MouseEvent): void {
    if (this.openMenuSeriesId() === seriesId) {
      this.openMenuSeriesId.set(null);
      return;
    }
    const fromKeyboard = event.detail === 0;
    this.openMenuSeriesId.set(seriesId);
    this.menuPlacement.set('below');
    afterNextRender(
      () => {
        this.placeMenu(seriesId);
        // Un clic produit au clavier (detail 0) place le focus sur le premier item.
        if (fromKeyboard) this.menuItems(seriesId)[0]?.focus();
      },
      { injector: this.injector },
    );
  }

  @HostListener('document:pointerdown', ['$event.target'])
  protected onDocumentPointerDown(target: EventTarget | null): void {
    if (this.openMenuSeriesId() === null) return;
    if (target instanceof Element && target.closest('.rule-menu-wrap')) return;
    this.openMenuSeriesId.set(null);
  }

  protected onMenuKeydown(event: KeyboardEvent, seriesId: string): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeMenu(seriesId);
      return;
    }
    if (event.key === 'Tab') {
      this.openMenuSeriesId.set(null);
      return;
    }

    const items = this.menuItems(seriesId);
    const index = items.indexOf(event.target as HTMLButtonElement);
    const last = items.length - 1;
    let target: HTMLButtonElement | undefined;
    if (event.key === 'ArrowDown') target = items[index >= last ? 0 : index + 1];
    else if (event.key === 'ArrowUp') target = items[index <= 0 ? last : index - 1];
    else if (event.key === 'Home') target = items[0];
    else if (event.key === 'End') target = items[last];
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  protected editFromMenu(rule: RecurringRule): void {
    this.openMenuSeriesId.set(null);
    this.startEdit(rule);
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLInputElement>('#recurring-rule-label')?.focus(), {
      injector: this.injector,
    });
  }

  protected setRuleActiveFromMenu(group: RecurringRuleGroup, active: boolean): void {
    this.openMenuSeriesId.set(null);
    this.setRuleActive(group.latest, active);
    afterNextRender(() => this.menuTrigger(group.seriesId)?.focus(), { injector: this.injector });
  }

  private closeMenu(seriesId: string): void {
    this.openMenuSeriesId.set(null);
    this.menuTrigger(seriesId)?.focus();
  }

  private placeMenu(seriesId: string): void {
    const trigger = this.menuTrigger(seriesId);
    const menu = trigger?.parentElement?.querySelector<HTMLElement>('.rule-menu');
    if (!trigger || !menu) return;

    const triggerRect = trigger.getBoundingClientRect();
    const bounds = this.visibleBounds(trigger);
    const spaceBelow = bounds.bottom - triggerRect.bottom;
    const spaceAbove = triggerRect.top - bounds.top;
    if (spaceBelow < menu.offsetHeight && spaceAbove > spaceBelow) {
      this.menuPlacement.set('above');
    }
  }

  // Bornes verticales visibles : le conteneur défilant le plus proche, sinon la fenêtre.
  private visibleBounds(element: HTMLElement): { top: number; bottom: number } {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (!CLIPPING_OVERFLOW.has(getComputedStyle(parent).overflowY)) continue;
      const rect = parent.getBoundingClientRect();
      return { top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) };
    }
    return { top: 0, bottom: window.innerHeight };
  }

  private menuTrigger(seriesId: string): HTMLButtonElement | null {
    return this.host.nativeElement.querySelector<HTMLButtonElement>(`[data-menu-trigger="${seriesId}"]`);
  }

  private menuItems(seriesId: string): HTMLButtonElement[] {
    const wrap = this.menuTrigger(seriesId)?.parentElement;
    return Array.from(wrap?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
  }

  protected saveRule(): void {
    this.errorKey.set(null);
    this.amountErrorKey.set(null);
    this.dayErrorKey.set(null);
    this.endMonthErrorKey.set(null);

    const values = this.form.getRawValue();
    const label = values.label.trim();
    const amount = this.moneyService.parseEurosInput(values.amountText);
    if (!amount.valid || amount.cents <= 0) {
      this.amountErrorKey.set('budgetMensuel.recurringRules.amountInvalid');
    }

    const dayText = values.dayOfMonth.trim();
    const dayOfMonth = dayText === '' ? undefined : Number(dayText);
    if (dayOfMonth !== undefined && (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31)) {
      this.dayErrorKey.set('budgetMensuel.recurringRules.dayInvalid');
    }
    const endMonthText = values.endMonth.trim();
    const endMonth = endMonthText === '' ? undefined : endMonthText;
    if (
      endMonth !== undefined &&
      (!MONTH_KEY_PATTERN.test(endMonth) || endMonth < this.monthContext.nextSystemMonthKey)
    ) {
      this.endMonthErrorKey.set('budgetMensuel.recurringRules.endMonthInvalid');
    }
    if (
      !label ||
      !values.categoryId ||
      !values.subcategoryId ||
      this.amountErrorKey() ||
      this.dayErrorKey() ||
      this.endMonthErrorKey()
    ) {
      if (!this.amountErrorKey() && !this.dayErrorKey() && !this.endMonthErrorKey()) {
        this.errorKey.set('budgetMensuel.recurringRules.ruleInvalid');
      }
      return;
    }
    if (!amount.valid || amount.cents <= 0) return;

    const input: RecurringRuleInput = {
      label,
      categoryId: values.categoryId,
      subcategoryId: values.subcategoryId,
      amountCents: amount.cents,
      ...(dayOfMonth === undefined ? {} : { dayOfMonth }),
      ...(endMonth === undefined ? {} : { endMonth }),
    };

    const editingRuleId = this.editingRuleId();
    if (editingRuleId === null) {
      this.ruleService.createRule(input);
      this.resetForm();
      return;
    }

    const currentRule = this.ruleService.rules().find(rule => rule.id === editingRuleId);
    if (!currentRule) {
      this.errorKey.set('budgetMensuel.recurringRules.ruleInvalid');
      return;
    }

    const patch: RecurringRulePatch = {
      ...input,
      active: currentRule.active,
      endMonth,
    };
    const change = this.ruleService.planVersionChange(editingRuleId, patch);
    this.pendingChange.set(change);
    if (this.hasPreparedOccurrences(currentRule.seriesId)) {
      this.syncChoice.set(true);
    } else {
      this.applyPendingChange(false);
    }
  }

  protected startEdit(rule: RecurringRule): void {
    this.resetForm();
    this.editingRuleId.set(rule.id);
    this.selectedCategoryId.set(rule.categoryId);
    this.form.patchValue(
      {
        label: rule.label,
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        amountText: this.formatEditableAmount(rule.amountCents),
        dayOfMonth: rule.dayOfMonth === undefined ? '' : String(rule.dayOfMonth),
        endMonth: rule.endMonth ?? '',
      },
      { emitEvent: false },
    );
    this.endMonthDraft.set(rule.endMonth ?? '');
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected cancelSyncChoice(): void {
    this.syncChoice.set(false);
    this.pendingChange.set(null);
    this.resetForm();
  }

  protected setRuleActive(rule: RecurringRule, active: boolean): void {
    this.errorKey.set(null);
    this.pendingChange.set(this.ruleService.planVersionChange(rule.id, { active }));
    if (this.hasPreparedOccurrences(rule.seriesId)) {
      this.syncChoice.set(true);
    } else {
      this.applyPendingChange(false);
    }
  }

  protected ruleStatusKey(rule: RecurringRule): string {
    if (!rule.active) return 'budgetMensuel.recurringRules.inactive';
    if (rule.startMonth > this.monthContext.systemMonthKey) return 'budgetMensuel.recurringRules.scheduled';
    if (rule.endMonth !== undefined && rule.endMonth < this.monthContext.systemMonthKey) {
      return 'budgetMensuel.recurringRules.ended';
    }
    return 'budgetMensuel.recurringRules.active';
  }

  protected periodStartKey(rule: RecurringRule): string {
    return rule.startMonth > this.monthContext.systemMonthKey
      ? 'budgetMensuel.recurringRules.fromMonthFuture'
      : 'budgetMensuel.recurringRules.fromMonthCurrent';
  }

  protected isEnded(rule: RecurringRule): boolean {
    return rule.endMonth !== undefined && rule.endMonth < this.monthContext.systemMonthKey;
  }

  protected canEdit(rule: RecurringRule): boolean {
    return !this.isEnded(rule);
  }

  protected shouldActivate(rule: RecurringRule): boolean {
    return !rule.active || this.isEnded(rule);
  }

  protected displayMonth(monthKey: string): string {
    return this.formatMonth(monthKey);
  }

  protected onEndMonthInput(value: string): void {
    this.form.controls.endMonth.setValue(value);
    this.endMonthDraft.set(value);
  }

  protected applyPendingChange(synchronizePreparedMonths: boolean): void {
    const change = this.pendingChange();
    if (!change) return;

    this.errorKey.set(null);
    try {
      this.budget.applyRecurringRuleVersionChange(change, synchronizePreparedMonths);
      this.resetForm();
    } catch (error: unknown) {
      this.syncChoice.set(false);
      this.pendingChange.set(null);
      this.errorKey.set(
        error instanceof PlannedAggregateOverflowError
          ? 'budgetMensuel.recurringRules.aggregateOverflow'
          : 'budgetMensuel.recurringRules.ruleInvalid',
      );
    }
  }

  private hasPreparedOccurrences(seriesId: string): boolean {
    const versions = new Set(this.ruleService.rules().filter(rule => rule.seriesId === seriesId).map(rule => rule.id));
    const preparedMonths = new Set(this.budget.months().filter(month => month.initialized).map(month => month.monthKey));
    return (
      this.budget.lines().some(
        line => preparedMonths.has(line.monthKey) && line.sourceRuleId !== undefined && versions.has(line.sourceRuleId),
      ) ||
      this.budget.recurringRuleSuppressions().some(
        suppression => preparedMonths.has(suppression.monthKey) && suppression.seriesId === seriesId,
      )
    );
  }

  private formatMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    return new Intl.DateTimeFormat(this.settings().locale, { month: 'long', year: 'numeric' }).format(
      new Date(year, month - 1, 1),
    );
  }

  private formatEditableAmount(amountCents: number): string {
    return `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, '0')}`;
  }

  private resetForm(): void {
    this.form.reset({ label: '', categoryId: '', subcategoryId: '', amountText: '', dayOfMonth: '', endMonth: '' });
    this.selectedCategoryId.set('');
    this.editingRuleId.set(null);
    this.pendingChange.set(null);
    this.syncChoice.set(false);
    this.errorKey.set(null);
    this.amountErrorKey.set(null);
    this.dayErrorKey.set(null);
    this.endMonthErrorKey.set(null);
    this.endMonthDraft.set('');
  }
}
