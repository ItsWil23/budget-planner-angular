import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BudgetEquation } from '../../components/ui/budget-equation/budget-equation';
import { MoneyPipe } from '../../components/ui/money-pipe/money-pipe';
import { OpeningBalance } from '../../components/ui/opening-balance/opening-balance';
import { ProgressBar } from '../../components/ui/progress-bar/progress-bar';
import { RecurringRuleManager } from '../../components/ui/recurring-rule-manager/recurring-rule-manager';
import { BudgetLineStatus } from '../../models/budget-status';
import { CategoryType } from '../../models/category';
import { BudgetService, PlannedAggregateOverflowError } from '../../services/budget';
import { CategoryService } from '../../services/category';
import { EurosInputResult, MoneyService } from '../../services/money';
import { MonthContextService } from '../../services/month-context';
import { SettingsService } from '../../services/settings';

export type SizeGroup = 'small' | 'medium' | 'large';

export interface SizedItem {
  readonly rowCount: number;
}

export interface ColumnSpec<T extends SizedItem> {
  readonly size: SizeGroup;
  readonly items: T[];
  rows: number;
}

interface LineProgress {
  readonly rate: number;
  readonly tone: BudgetLineStatus;
}

interface LineView {
  readonly id: string;
  readonly name: string;
  readonly type: CategoryType;
  readonly plannedCents: number;
  readonly actualCents: number;
  readonly progress: LineProgress | undefined;
}

interface CategoryView extends SizedItem {
  readonly id: string;
  readonly name: string;
  readonly type: CategoryType;
  readonly plannedCents: number;
  readonly actualCents: number;
  readonly lines: readonly LineView[];
}

type TableLayout = 'columns' | 'balanced';
/** Erreur d'édition du Prévu : saisie individuelle invalide, ou dépassement d'agrégat refusé. */
type PlannedErrorKind = 'invalid' | 'aggregate';

const ROW_CAPACITY = 18;
const MAX_SMALL_PER_COLUMN = 3;
const MAX_MEDIUM_PER_COLUMN = 2;
const SMALL_MAX_ROWS = 5;
const MEDIUM_MAX_ROWS = 10;
// Doit rester égal à --space-lg, l'espace entre colonnes du mode desktop.
const COLUMN_GAP_PX = 16;
const MIN_COLUMN_WIDTH_PX = 320;
const MAX_COLUMNS = 5;
const DESKTOP_QUERY = '(min-width: 1024px)';
const CARD_ID_PREFIX = 'budget-category-';

export function sizeGroupOf(rowCount: number): SizeGroup {
  if (rowCount <= SMALL_MAX_ROWS) return 'small';
  if (rowCount <= MEDIUM_MAX_ROWS) return 'medium';
  return 'large';
}

function packSmallColumns<T extends SizedItem>(items: readonly T[]): ColumnSpec<T>[] {
  const columns: ColumnSpec<T>[] = [];
  for (const item of items) {
    const last = columns.at(-1);
    if (last && last.items.length < MAX_SMALL_PER_COLUMN && last.rows + item.rowCount <= ROW_CAPACITY) {
      last.items.push(item);
      last.rows += item.rowCount;
    } else {
      columns.push({ size: 'small', items: [item], rows: item.rowCount });
    }
  }
  return columns;
}

function pairMediumColumns<T extends SizedItem>(items: readonly T[]): ColumnSpec<T>[] {
  const columns: ColumnSpec<T>[] = [];
  for (let index = 0; index < items.length; index += MAX_MEDIUM_PER_COLUMN) {
    const pair = items.slice(index, index + MAX_MEDIUM_PER_COLUMN);
    const rows = pair.reduce((sum, item) => sum + item.rowCount, 0);
    if (rows <= ROW_CAPACITY) {
      columns.push({ size: 'medium', items: pair, rows });
    } else {
      for (const item of pair) {
        columns.push({ size: 'medium', items: [item], rows: item.rowCount });
      }
    }
  }
  return columns;
}

/**
 * Répartit les catégories en colonnes desktop : petites (empaquetées), puis moyennes (paires),
 * puis grandes (une par colonne, par nombre de lignes croissant). L'ordre d'entrée est conservé
 * dans les groupes petites et moyennes.
 */
export function buildCategoryColumns<T extends SizedItem>(items: readonly T[]): ColumnSpec<T>[] {
  const bySize = (size: SizeGroup): T[] => items.filter(item => sizeGroupOf(item.rowCount) === size);
  const largeColumns: ColumnSpec<T>[] = bySize('large')
    .sort((first, second) => first.rowCount - second.rowCount)
    .map(item => ({ size: 'large', items: [item], rows: item.rowCount }));
  return [...packSmallColumns(bySize('small')), ...pairMediumColumns(bySize('medium')), ...largeColumns];
}

export type ColumnPlan<T extends SizedItem> =
  | { readonly mode: 'columns'; readonly columns: ColumnSpec<T>[] }
  | { readonly mode: 'balanced' };

/** Nombre de colonnes de catégories possibles pour une largeur donnée, au plus 5. */
export function maxColumnsFor(width: number): number {
  return Math.min(MAX_COLUMNS, Math.floor((width + COLUMN_GAP_PX) / (MIN_COLUMN_WIDTH_PX + COLUMN_GAP_PX)));
}

/**
 * Réduit le regroupement à `maxColumns` colonnes en fusionnant des colonnes adjacentes de même groupe.
 * Bascule en disposition équilibrée si les grandes catégories et les groupes présents ne tiennent pas.
 */
export function planCategoryColumns<T extends SizedItem>(items: readonly T[], maxColumns: number): ColumnPlan<T> {
  if (maxColumns < 2 || items.length === 0) return { mode: 'balanced' };
  const columns = buildCategoryColumns(items);
  const largeCount = columns.filter(column => column.size === 'large').length;
  const groupCount = new Set(columns.filter(column => column.size !== 'large').map(column => column.size)).size;
  if (largeCount + groupCount > maxColumns) return { mode: 'balanced' };

  let merged = columns;
  while (merged.length > maxColumns) {
    let index = -1;
    let rows = Infinity;
    for (let candidate = 0; candidate < merged.length - 1; candidate += 1) {
      const first = merged[candidate];
      const second = merged[candidate + 1];
      if (first.size === 'large' || first.size !== second.size) continue;
      if (first.rows + second.rows < rows) {
        rows = first.rows + second.rows;
        index = candidate;
      }
    }
    if (index < 0) return { mode: 'balanced' };
    const first = merged[index];
    const second = merged[index + 1];
    merged = [
      ...merged.slice(0, index),
      { size: first.size, items: [...first.items, ...second.items], rows },
      ...merged.slice(index + 2),
    ];
  }
  return { mode: 'columns', columns: merged };
}

/**
 * Pour un revenu, un statut `under` (encaissé en dessous du prévu) est défavorable et `over` favorable :
 * seul le ton de remplissage est inversé, le statut métier du service reste inchangé.
 */
function toneOf(status: BudgetLineStatus, type: CategoryType): BudgetLineStatus {
  if (type !== 'income') return status;
  if (status === 'under') return 'over';
  if (status === 'over') return 'under';
  return status;
}

function progressOf(
  plannedCents: number,
  type: CategoryType,
  consumptionRate: number | undefined,
  status: BudgetLineStatus | undefined,
): LineProgress | undefined {
  if (plannedCents <= 0 || consumptionRate === undefined || status === undefined) {
    return undefined;
  }
  return { rate: consumptionRate, tone: toneOf(status, type) };
}

function nameLookup(items: readonly { id: string; name: string }[]): (id: string) => string {
  const names = new Map<string, string>();
  for (const item of items) {
    names.set(item.id, item.name);
  }
  return id => names.get(id) ?? '';
}

@Component({
  selector: 'app-budget-mensuel',
  imports: [BudgetEquation, MoneyPipe, NgTemplateOutlet, OpeningBalance, ProgressBar, RecurringRuleManager, TranslocoPipe],
  templateUrl: './budget-mensuel.html',
  styleUrl: './budget-mensuel.scss',
})
export class BudgetMensuel {
  private readonly budget = inject(BudgetService);
  private readonly categoryService = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly moneyService = inject(MoneyService);
  private readonly monthContext = inject(MonthContextService);
  private readonly openingBalance = viewChild(OpeningBalance);

  protected readonly monthSummary = this.budget.monthSummary;
  protected readonly settings = inject(SettingsService).settings;

  private readonly hostWidth = signal(0);
  private readonly isDesktop = signal(false);

  protected readonly editingId = signal<string | null>(null);
  protected readonly editDraft = signal('');
  protected readonly editError = signal<PlannedErrorKind | null>(null);
  protected readonly plannedErrorKey = computed(() =>
    this.editError() === 'aggregate'
      ? 'budgetMensuel.table.amountAggregateOverflow'
      : 'budgetMensuel.table.amountInvalid',
  );
  /** Mois dont la préparation a été refusée : l'alerte ne vaut que pour ce mois. */
  private readonly prepareRefusedMonthKey = signal<string | null>(null);
  protected readonly prepareFailed = computed(
    () => !this.isOpened() && this.prepareRefusedMonthKey() === this.monthContext.monthKey(),
  );
  protected readonly recurringRulesOpen = signal(false);

  protected readonly isOpened = computed(() => this.budget.isMonthOpened(this.monthContext.monthKey()));
  protected readonly openingBalanceCents = computed(() => this.monthSummary().openingBalanceCents);
  protected readonly openingOverridden = computed(
    () =>
      this.budget
        .months()
        .find(month => month.monthKey === this.monthContext.monthKey())?.openingBalanceOverridden === true,
  );
  protected readonly openingEditable = computed(() => this.formatEditableEuros(this.openingBalanceCents()));
  /** Gabarit du champ d'ouverture, présent seulement pendant l'édition : il remplace la valeur dans l'équation. */
  protected readonly openingEditorTemplate = computed(() => {
    const opening = this.openingBalance();
    return opening?.editing() ? opening.editorTemplate() : null;
  });
  /** Brouillon d'ouverture en centimes, `null` hors édition, `'invalid'` si la saisie est incomplète. */
  protected readonly openingDraft = computed<number | 'invalid' | null>(() => {
    const opening = this.openingBalance();
    if (!opening?.editing()) return null;
    const parsed = this.moneyService.parseEurosInput(opening.draft());
    return parsed.valid ? parsed.cents : 'invalid';
  });
  /** Clôture affichée : celle du brouillon pendant l'édition, sinon celle du résumé. */
  protected readonly closingPreview = computed<number | null | 'invalid'>(() => {
    const draft = this.openingDraft();
    if (draft === null) return this.monthSummary().budgetedClosingBalanceCents;
    if (draft === 'invalid') return 'invalid';
    return this.budget.previewBudgetedClosingBalanceCents(draft);
  });

  protected readonly categories = computed<CategoryView[]>(() => {
    const categoryName = nameLookup(this.categoryService.categories());
    const subcategoryName = nameLookup(this.categoryService.subcategories());
    return this.monthSummary().categories.map(category => ({
      id: category.categoryId,
      name: categoryName(category.categoryId),
      type: category.categoryType,
      plannedCents: category.plannedAmountCents,
      actualCents: category.actualAmountCents,
      rowCount: category.subcategories.length,
      lines: category.subcategories.map(line => ({
        id: line.subcategoryId,
        name: subcategoryName(line.subcategoryId),
        type: line.categoryType,
        plannedCents: line.plannedAmountCents,
        actualCents: line.actualAmountCents,
        progress: progressOf(line.plannedAmountCents, line.categoryType, line.consumptionRate, line.status),
      })),
    }));
  });

  protected readonly plan = computed<ColumnPlan<CategoryView>>(() =>
    this.isDesktop() ? planCategoryColumns(this.categories(), maxColumnsFor(this.hostWidth())) : { mode: 'balanced' },
  );

  protected readonly columns = computed(() => {
    const plan = this.plan();
    return plan.mode === 'columns' ? plan.columns : [];
  });

  protected readonly layout = computed<TableLayout>(() => this.plan().mode);

  constructor() {
    this.trackHostWidth();
    this.trackDesktopBreakpoint();
  }

  protected openRecurringRules(): void {
    this.recurringRulesOpen.set(true);
  }

  protected closeRecurringRules(): void {
    this.recurringRulesOpen.set(false);
  }

  /** Dans les cards, les dépenses sont affichées en positif ; seul un revenu positif garde son « + ». */
  protected cardSign(amountCents: number, type: CategoryType): CategoryType | undefined {
    return type === 'income' && amountCents > 0 ? type : undefined;
  }

  protected cardAmount(amountCents: number): number {
    return Math.abs(amountCents);
  }

  protected cardId(categoryId: string): string {
    return `${CARD_ID_PREFIX}${categoryId}`;
  }

  protected plannedButtonId(subcategoryId: string): string {
    return `budget-planned-${subcategoryId}`;
  }

  protected plannedInputId(subcategoryId: string): string {
    return `budget-planned-input-${subcategoryId}`;
  }

  protected plannedErrorId(subcategoryId: string): string {
    return `budget-planned-error-${subcategoryId}`;
  }

  protected isEditing(subcategoryId: string): boolean {
    return this.editingId() === subcategoryId;
  }

  protected startEdit(line: LineView): void {
    this.editDraft.set(this.draftOf(line.plannedCents));
    this.editError.set(null);
    this.editingId.set(line.id);
    afterNextRender(() => this.document.getElementById(this.plannedInputId(line.id))?.focus(), {
      injector: this.injector,
    });
  }

  protected commitEdit(line: LineView, raw: string): void {
    const parsed = this.parsePlannedInput(raw);
    if (!parsed.valid) {
      this.editError.set('invalid');
      return;
    }
    this.savePlanned(line.id, parsed.cents);
  }

  protected cancelEdit(subcategoryId: string): void {
    if (!this.isEditing(subcategoryId)) return;
    this.closeEdit();
    this.focusPlannedButton(subcategoryId);
  }

  /** Geste explicite de réinitialisation : enregistre zéro immédiatement, sans passer par le brouillon. */
  protected clearPlanned(line: LineView): void {
    if (!this.isEditing(line.id)) return;
    this.savePlanned(line.id, 0);
  }

  /** Le blur annule l'édition, sauf si le focus reste dans le même contrôle (champ ou croix). */
  protected cancelOnBlur(subcategoryId: string, event: FocusEvent): void {
    if (!this.isEditing(subcategoryId)) return;
    const editor = event.target instanceof Element ? event.target.closest('.planned-edit') : null;
    if (event.relatedTarget instanceof Node && editor?.contains(event.relatedTarget)) return;
    this.closeEdit();
  }

  private savePlanned(subcategoryId: string, amountCents: number): void {
    try {
      this.budget.setPlannedAmount(this.monthContext.monthKey(), subcategoryId, amountCents);
    } catch (error) {
      if (error instanceof PlannedAggregateOverflowError) {
        this.editError.set('aggregate');
        return;
      }
      throw error;
    }
    this.closeEdit();
    this.focusPlannedButton(subcategoryId);
  }

  /** Vide vaut zéro (suppression). Le signe moins est refusé même pour « -0 », que parseEurosInput accepterait. */
  private parsePlannedInput(raw: string): EurosInputResult {
    const trimmed = raw.trim();
    if (trimmed === '') return { valid: true, cents: 0 };
    if (/^[-\u2212]/.test(trimmed)) return { valid: false, error: 'invalid' };
    return this.moneyService.parseEurosInput(trimmed);
  }

  private closeEdit(): void {
    this.editingId.set(null);
    this.editError.set(null);
  }

  private focusPlannedButton(subcategoryId: string): void {
    afterNextRender(() => this.document.getElementById(this.plannedButtonId(subcategoryId))?.focus(), {
      injector: this.injector,
    });
  }

  private draftOf(plannedCents: number): string {
    if (plannedCents <= 0) return '';
    return this.formatEditableEuros(plannedCents);
  }

  private formatEditableEuros(amountCents: number): string {
    return this.moneyService.toEditableString(amountCents, this.settings().locale);
  }

  protected saveOpeningBalance(openingBalanceCents: number): void {
    this.budget.setOpeningBalanceOverride(this.monthContext.monthKey(), openingBalanceCents);
  }

  protected prepareMonth(): void {
    const monthKey = this.monthContext.monthKey();
    try {
      this.budget.openMonth(monthKey);
    } catch (error) {
      if (error instanceof PlannedAggregateOverflowError) {
        this.prepareRefusedMonthKey.set(monthKey);
        return;
      }
      throw error;
    }
    this.prepareRefusedMonthKey.set(null);
  }

  protected clearOpeningOverride(): void {
    this.budget.clearOpeningBalanceOverride(this.monthContext.monthKey());
  }

  protected openCard(event: Event, categoryId: string): void {
    event.preventDefault();
    const card = this.document.getElementById(this.cardId(categoryId));
    if (!(card instanceof HTMLDetailsElement)) return;
    card.open = true;
    card.scrollIntoView({ block: 'start' });
    card.querySelector('summary')?.focus();
  }

  private trackHostWidth(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      this.hostWidth.set(entries.at(-1)?.contentRect.width ?? 0);
    });
    observer.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private trackDesktopBreakpoint(): void {
    const view = this.document.defaultView;
    if (!view || typeof view.matchMedia !== 'function') return;
    const query = view.matchMedia(DESKTOP_QUERY);
    const update = (): void => this.isDesktop.set(query.matches);
    update();
    query.addEventListener('change', update);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', update));
  }
}
