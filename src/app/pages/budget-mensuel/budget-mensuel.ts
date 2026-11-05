import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MoneyPipe } from '../../components/ui/money-pipe/money-pipe';
import { ProgressBar } from '../../components/ui/progress-bar/progress-bar';
import { BudgetLineStatus } from '../../models/budget-status';
import { CategoryType } from '../../models/category';
import { BudgetService } from '../../services/budget';
import { CategoryService } from '../../services/category';
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
  readonly status: BudgetLineStatus;
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

const ROW_CAPACITY = 18;
const MAX_SMALL_PER_COLUMN = 3;
const MAX_MEDIUM_PER_COLUMN = 2;
const SMALL_MAX_ROWS = 5;
const MEDIUM_MAX_ROWS = 10;
// Doit rester égal à --space-lg, l'espace entre colonnes du mode desktop.
const COLUMN_GAP_PX = 16;
const MIN_COLUMN_WIDTH_PX = 240;
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

function progressOf(
  plannedCents: number,
  consumptionRate: number | undefined,
  status: BudgetLineStatus | undefined,
): LineProgress | undefined {
  if (plannedCents <= 0 || consumptionRate === undefined || status === undefined) {
    return undefined;
  }
  return { rate: consumptionRate, status };
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
  imports: [MoneyPipe, NgTemplateOutlet, ProgressBar, TranslocoPipe],
  templateUrl: './budget-mensuel.html',
  styleUrl: './budget-mensuel.scss',
})
export class BudgetMensuel {
  private readonly budget = inject(BudgetService);
  private readonly categoryService = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly monthSummary = this.budget.monthSummary;
  protected readonly settings = inject(SettingsService).settings;

  private readonly hostWidth = signal(0);
  private readonly isDesktop = signal(false);

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
        progress: progressOf(line.plannedAmountCents, line.consumptionRate, line.status),
      })),
    }));
  });

  protected readonly columns = computed(() => buildCategoryColumns(this.categories()));

  protected readonly layout = computed<TableLayout>(() => {
    const columnCount = this.columns().length;
    if (!this.isDesktop() || columnCount === 0) return 'balanced';
    const requiredWidth = columnCount * MIN_COLUMN_WIDTH_PX + (columnCount - 1) * COLUMN_GAP_PX;
    return this.hostWidth() >= requiredWidth ? 'columns' : 'balanced';
  });

  constructor() {
    this.trackHostWidth();
    this.trackDesktopBreakpoint();
  }

  protected signedType(amountCents: number, type: CategoryType): CategoryType | undefined {
    return amountCents > 0 ? type : undefined;
  }

  protected cardId(categoryId: string): string {
    return `${CARD_ID_PREFIX}${categoryId}`;
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
