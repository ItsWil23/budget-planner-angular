import { computed, Injectable, signal } from '@angular/core';
import { BudgetLine } from '../models/budget-line';
import { BudgetMonth, OpenMonthResult } from '../models/budget-month';
import { CategoryType } from '../models/category';
import { BudgetLineStatus, getBudgetLineStatus } from '../models/budget-status';
import { RecurringRuleSuppression } from '../models/recurring-rule-suppression';
import {
  BudgetCategorySummary,
  BudgetMonthSummary,
  BudgetSubcategorySummary,
} from '../models/budget-summary';
import { RecurringRule, RecurringRuleVersionChange } from '../models/recurring-rule';
import { RemovedTransaction, Transaction, TransactionInput } from '../models/transactions';
import { CategoryService } from './category';
import { MonthContextService } from './month-context';
import { RecurringRuleService } from './recurring-rule';
import { assertValidTransactionInput, resolveTransactionType, TransactionService } from './transaction';

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type BudgetFigures = Pick<
  BudgetCategorySummary,
  'plannedAmountCents' | 'actualAmountCents' | 'varianceCents' | 'consumptionRate' | 'status'
>;

function sumBy<T>(items: readonly T[], getAmountCents: (item: T) => number): number {
  return items.reduce((total, item) => total + getAmountCents(item), 0);
}

function buildFigures(plannedAmountCents: number, actualAmountCents: number): BudgetFigures {
  const figures = {
    plannedAmountCents,
    actualAmountCents,
    varianceCents: actualAmountCents - plannedAmountCents,
  };

  // Sans prévu, le taux et le statut ne sont pas définissables.
  if (plannedAmountCents <= 0) {
    return { ...figures, consumptionRate: undefined, status: undefined };
  }

  const status: BudgetLineStatus = getBudgetLineStatus(actualAmountCents, plannedAmountCents);
  return {
    ...figures,
    consumptionRate: actualAmountCents / plannedAmountCents,
    status,
  };
}

interface MonthlyActualTotals {
  incomeCents: number;
  expenseCents: number;
}

interface ResolvedMonths {
  months: BudgetMonth[];
  closingCentsByMonthKey: ReadonlyMap<string, number>;
}

/**
 * Levée lorsqu'une mutation ferait dépasser `Number.MAX_SAFE_INTEGER` au total prévu d'une catégorie
 * ou au total prévu mensuel des revenus ou des dépenses. Aucune ligne n'est alors modifiée.
 */
export class PlannedAggregateOverflowError extends RangeError {
  constructor() {
    super('Planned aggregate overflow');
    this.name = 'PlannedAggregateOverflowError';
  }
}

const MAX_SAFE_CENTS_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Vérifie en BigInt, donc sans arrondi, que les totaux prévus du mois restent représentables :
 * celui de la catégorie touchée et celui de son type (revenus ou dépenses).
 */
function assertPlannedTotalsSafe(
  lines: readonly BudgetLine[],
  monthKey: string,
  categoryId: string,
  categoryTypes: ReadonlyMap<string, CategoryType>,
): void {
  const categoryType = categoryTypes.get(categoryId);
  let categoryTotal = BigInt(0);
  let typeTotal = BigInt(0);

  for (const line of lines) {
    if (line.monthKey !== monthKey) {
      continue;
    }
    const amount = BigInt(line.plannedAmountCents);
    if (line.categoryId === categoryId) {
      categoryTotal += amount;
    }
    if (categoryType !== undefined && categoryTypes.get(line.categoryId) === categoryType) {
      typeTotal += amount;
    }
  }

  if (categoryTotal > MAX_SAFE_CENTS_BIGINT || typeTotal > MAX_SAFE_CENTS_BIGINT) {
    throw new PlannedAggregateOverflowError();
  }
}

function netCents(totals: MonthlyActualTotals | undefined): number {
  return totals ? totals.incomeCents - totals.expenseCents : 0;
}

function shiftMonthKey(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const monthIndex = year * 12 + (month - 1) + offset;
  const shiftedYear = Math.floor(monthIndex / 12);
  const shiftedMonth = (monthIndex % 12) + 1;
  return `${String(shiftedYear).padStart(4, '0')}-${String(shiftedMonth).padStart(2, '0')}`;
}

function previousMonthKey(monthKey: string): string {
  return shiftMonthKey(monthKey, -1);
}

/**
 * Levée lorsqu'un ajout de transaction ferait dépasser `Number.MAX_SAFE_INTEGER` à une somme réelle
 * ou à un solde d'ouverture/clôture affiché ou propagé. Aucune transaction ni aucun solde n'est alors modifié.
 */
export class TransactionAggregateOverflowError extends RangeError {
  constructor() {
    super('Transaction aggregate overflow');
    this.name = 'TransactionAggregateOverflowError';
  }
}

interface MonthBalance {
  openingCents: bigint;
  closingCents: bigint;
}

function isSafeCentsBigInt(value: bigint): boolean {
  return value <= MAX_SAFE_CENTS_BIGINT && value >= -MAX_SAFE_CENTS_BIGINT;
}

/**
 * Clôture budgétée : ouverture + revenus prévus − dépenses prévues, calculée en BigInt.
 * Renvoie `null` si le résultat sort de la plage entière sûre, plutôt qu'une valeur arrondie.
 */
function budgetedClosingCents(
  openingBalanceCents: number,
  incomePlannedCents: number,
  expensePlannedCents: number,
): number | null {
  const closing =
    BigInt(openingBalanceCents) + BigInt(incomePlannedCents) - BigInt(expensePlannedCents);
  return isSafeCentsBigInt(closing) ? Number(closing) : null;
}

/**
 * Recalcule en BigInt les ouvertures et clôtures des mois de `keys`, avec la même règle que `resolvedMonths` :
 * une ouverture surchargée est conservée, sinon elle reprend la clôture du mois précédent initialisé (0 à défaut).
 * `months` doit être trié par ordre croissant et `netByMonthKey` contient le solde net réel de chaque mois.
 */
function computeMonthBalances(
  months: readonly BudgetMonth[],
  netByMonthKey: ReadonlyMap<string, bigint>,
  keys: ReadonlySet<string>,
): Map<string, MonthBalance> {
  const monthByKey = new Map(months.map(month => [month.monthKey, month] as const));
  const closingByMonthKey = new Map<string, bigint>();
  const balances = new Map<string, MonthBalance>();

  const sortedKeys = [...keys].sort((left, right) => left.localeCompare(right));
  for (const key of sortedKeys) {
    const month = monthByKey.get(key);
    const automaticOpeningCents = closingByMonthKey.get(previousMonthKey(key)) ?? BigInt(0);
    const openingCents =
      month?.openingBalanceOverridden === true
        ? BigInt(month.openingBalanceCents)
        : automaticOpeningCents;
    const closingCents = openingCents + (netByMonthKey.get(key) ?? BigInt(0));

    if (month !== undefined) {
      closingByMonthKey.set(key, closingCents);
    }
    balances.set(key, { openingCents, closingCents });
  }

  return balances;
}

/** Ce qui détermine les totaux et la cascade d'une transaction pendant le précontrôle. */
type TransactionFootprint = Pick<
  Transaction,
  'categoryId' | 'subcategoryId' | 'monthKey' | 'amountCents' | 'type'
>;

function netByMonthKey(transactions: readonly TransactionFootprint[]): Map<string, bigint> {
  const netByKey = new Map<string, bigint>();
  for (const transaction of transactions) {
    const cents = BigInt(transaction.amountCents);
    const net = transaction.type === 'income' ? cents : -cents;
    netByKey.set(transaction.monthKey, (netByKey.get(transaction.monthKey) ?? BigInt(0)) + net);
  }
  return netByKey;
}

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private readonly _lines = signal<BudgetLine[]>([]);
  private readonly _months = signal<BudgetMonth[]>([]);
  private readonly _recurringRuleSuppressions = signal<RecurringRuleSuppression[]>([]);

  readonly lines = this._lines.asReadonly();
  readonly recurringRuleSuppressions = this._recurringRuleSuppressions.asReadonly();
  readonly months = computed<BudgetMonth[]>(() => this.resolvedMonths().months);

  private readonly actualTotalsByMonthKey = computed<Map<string, MonthlyActualTotals>>(() => {
    const totals = new Map<string, MonthlyActualTotals>();
    for (const transaction of this.transactionService.transactions()) {
      const current = totals.get(transaction.monthKey) ?? { incomeCents: 0, expenseCents: 0 };
      if (transaction.type === 'income') {
        current.incomeCents += transaction.amountCents;
      } else {
        current.expenseCents += transaction.amountCents;
      }
      totals.set(transaction.monthKey, current);
    }
    return totals;
  });

  private readonly resolvedMonths = computed<ResolvedMonths>(() => {
    const totalsByMonthKey = this.actualTotalsByMonthKey();
    const closingCentsByMonthKey = new Map<string, number>();
    const months: BudgetMonth[] = [];

    // Parcours par ordre croissant : si M-1 est initialisé, il a déjà été traité juste avant M.
    const sortedMonths = [...this._months()].sort((left, right) =>
      left.monthKey.localeCompare(right.monthKey),
    );
    for (const month of sortedMonths) {
      const automaticOpeningCents = closingCentsByMonthKey.get(previousMonthKey(month.monthKey)) ?? 0;
      const openingBalanceCents = month.openingBalanceOverridden
        ? month.openingBalanceCents
        : automaticOpeningCents;

      closingCentsByMonthKey.set(
        month.monthKey,
        openingBalanceCents + netCents(totalsByMonthKey.get(month.monthKey)),
      );
      months.push({ ...month, openingBalanceCents });
    }

    return { months, closingCentsByMonthKey };
  });

  readonly monthSummary = computed<BudgetMonthSummary>(() => {
    const monthKey = this.monthContextService.monthKey();

    const monthLines = this._lines().filter(line => line.monthKey === monthKey);
    const monthTransactions: Transaction[] = this.transactionService
      .transactions()
      .filter(transaction => transaction.monthKey === monthKey);
    const subcategories = this.categoryService.subcategories();

    const categories = this.categoryService.categories().map((category): BudgetCategorySummary => {
      const categoryLines = monthLines.filter(line => line.categoryId === category.id);
      const categoryTransactions = monthTransactions.filter(
        transaction => transaction.categoryId === category.id,
      );

      const subcategorySummaries = subcategories
        .filter(subcategory => subcategory.categoryId === category.id)
        .map((subcategory): BudgetSubcategorySummary => {
          const plannedAmountCents = sumBy(
            monthLines.filter(line => line.subcategoryId === subcategory.id),
            line => line.plannedAmountCents,
          );
          const actualAmountCents = sumBy(
            categoryTransactions.filter(
              transaction => transaction.subcategoryId === subcategory.id,
            ),
            transaction => transaction.amountCents,
          );
          return {
            categoryId: category.id,
            subcategoryId: subcategory.id,
            categoryType: category.type,
            ...buildFigures(plannedAmountCents, actualAmountCents),
          };
        });

      return {
        categoryId: category.id,
        categoryType: category.type,
        ...buildFigures(
          sumBy(categoryLines, line => line.plannedAmountCents),
          sumBy(categoryTransactions, transaction => transaction.amountCents),
        ),
        subcategories: subcategorySummaries,
      };
    });

    const incomePlannedCents = sumBy(
      categories.filter(category => category.categoryType === 'income'),
      category => category.plannedAmountCents,
    );
    const expensePlannedCents = sumBy(
      categories.filter(category => category.categoryType === 'expense'),
      category => category.plannedAmountCents,
    );

    const openingBalanceCents = this.openingCentsFor(monthKey);

    return {
      monthKey,
      categories,
      incomePlannedCents,
      expensePlannedCents,
      unallocatedCents: incomePlannedCents - expensePlannedCents,
      openingBalanceCents,
      actualClosingBalanceCents: this.closingCentsFor(monthKey),
      budgetedClosingBalanceCents: budgetedClosingCents(
        openingBalanceCents,
        incomePlannedCents,
        expensePlannedCents,
      ),
    };
  });

  constructor(
    private readonly categoryService: CategoryService,
    private readonly recurringRuleService: RecurringRuleService,
    private readonly transactionService: TransactionService,
    private readonly monthContextService: MonthContextService,
  ) {}

  /**
   * Enregistre le prévu d'une sous-catégorie en centimes entiers sûrs. Zéro supprime la ligne.
   * La mutation est refusée sans rien modifier si elle ferait dépasser `Number.MAX_SAFE_INTEGER`
   * au total prévu de la catégorie ou au total prévu mensuel des revenus ou des dépenses.
   *
   * @throws Error('Invalid amount') si le montant n'est pas un entier sûr positif ou nul
   * @throws PlannedAggregateOverflowError si l'agrégat prévu ne serait plus représentable
   */
  setPlannedAmount(monthKey: string, subcategoryId: string, amountCents: number): BudgetLine | null {
    this.assertValidMonthKey(monthKey);

    const subcategory = this.categoryService
      .subcategories()
      .find(sub => sub.id === subcategoryId);
    if (!subcategory) {
      throw new Error('Unknown subcategory');
    }

    if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
      throw new Error('Invalid amount');
    }

    const currentLines = this._lines();
    const existing = currentLines.find(
      line => line.monthKey === monthKey && line.subcategoryId === subcategoryId,
    );
    const sourceRule = existing?.sourceRuleId
      ? this.recurringRuleService.rules().find(rule => rule.id === existing.sourceRuleId)
      : undefined;

    if (amountCents === 0) {
      const activeRule = sourceRule ?? this.recurringRuleService
        .activeRulesForMonth(monthKey)
        .find(rule => rule.subcategoryId === subcategoryId);
      const nextLines = currentLines.filter(
        line => line.monthKey !== monthKey || line.subcategoryId !== subcategoryId,
      );
      const nextSuppressions = this._recurringRuleSuppressions().filter(
        item => item.monthKey !== monthKey || item.subcategoryId !== subcategoryId,
      );
      if (existing && activeRule) {
        nextSuppressions.push({ monthKey, seriesId: activeRule.seriesId, subcategoryId });
      }
      this._lines.set(nextLines);
      this._recurringRuleSuppressions.set(nextSuppressions);
      return null;
    }

    const line: BudgetLine = existing
      ? { ...existing, plannedAmountCents: amountCents, sourceRuleId: undefined }
      : {
          id: crypto.randomUUID(),
          monthKey,
          categoryId: subcategory.categoryId,
          subcategoryId,
          plannedAmountCents: amountCents,
        };

    const nextLines = existing
      ? currentLines.map(current => (current === existing ? line : current))
      : [...currentLines, line];
    this.assertPlannedAggregatesSafe(nextLines, monthKey, [subcategory.categoryId]);
    this._lines.set(nextLines);
    this._recurringRuleSuppressions.update(suppressions =>
      suppressions.filter(item => item.monthKey !== monthKey || item.subcategoryId !== subcategoryId),
    );

    return line;
  }

  /**
   * Applique une transition de version, en synchronisant uniquement les mois préparés si demandé.
   * Toutes les sommes sont validées avant les mutations des règles, lignes ou suppressions.
   */
  applyRecurringRuleVersionChange(
    change: RecurringRuleVersionChange,
    synchronizePreparedMonths: boolean,
  ): void {
    const rules = this.recurringRuleService.rules();
    const sourceRule = rules.find(rule => rule.id === change.sourceVersionId);
    if (!sourceRule || sourceRule.seriesId !== change.nextVersion.seriesId) {
      throw new Error('Invalid recurring rule version change');
    }

    if (!synchronizePreparedMonths) {
      this.recurringRuleService.commitVersionChange(change);
      return;
    }

    if (!this.isValidRuleAmount(change.nextVersion)) {
      throw new Error('Invalid recurring rule amount');
    }

    const subcategory = this.categoryService
      .subcategories()
      .find(item => item.id === change.nextVersion.subcategoryId);
    if (!subcategory || subcategory.categoryId !== change.nextVersion.categoryId) {
      throw new Error('Invalid recurring rule subcategory');
    }

    const seriesId = change.nextVersion.seriesId;
    const seriesRuleIds = new Set(rules.filter(rule => rule.seriesId === seriesId).map(rule => rule.id));
    const currentLines = this._lines();
    let nextLines = [...currentLines];
    const suppressions = this._recurringRuleSuppressions();
    const changedCategoriesByMonth = new Map<string, Set<string>>();

    const preparedMonths = this._months().filter(month => month.initialized);
    for (const month of preparedMonths) {
      const generatedLines = nextLines.filter(
        line => line.monthKey === month.monthKey && line.sourceRuleId !== undefined && seriesRuleIds.has(line.sourceRuleId),
      );
      const hasSuppression = suppressions.some(
        item => item.monthKey === month.monthKey && item.seriesId === seriesId,
      );
      if (generatedLines.length === 0 && !hasSuppression) continue;

      const changedCategories = new Set<string>();
      nextLines = nextLines.filter(line => {
        const isGeneratedForSeries =
          line.monthKey === month.monthKey &&
          line.sourceRuleId !== undefined &&
          seriesRuleIds.has(line.sourceRuleId);
        if (isGeneratedForSeries) changedCategories.add(line.categoryId);
        return !isGeneratedForSeries;
      });

      const isSuppressed = suppressions.some(
        item =>
          item.monthKey === month.monthKey &&
          item.seriesId === seriesId &&
          item.subcategoryId === change.nextVersion.subcategoryId,
      );
      const slotOccupied = nextLines.some(
        line =>
          line.monthKey === month.monthKey &&
          line.subcategoryId === change.nextVersion.subcategoryId,
      );
      if (change.nextVersion.active && !isSuppressed && !slotOccupied) {
        nextLines.push({
          id: crypto.randomUUID(),
          monthKey: month.monthKey,
          categoryId: change.nextVersion.categoryId,
          subcategoryId: change.nextVersion.subcategoryId,
          plannedAmountCents: change.nextVersion.amountCents,
          sourceRuleId: change.nextVersion.id,
        });
        changedCategories.add(change.nextVersion.categoryId);
      }

      if (changedCategories.size > 0) {
        changedCategoriesByMonth.set(month.monthKey, changedCategories);
      }
    }

    for (const [monthKey, categoryIds] of changedCategoriesByMonth) {
      this.assertPlannedAggregatesSafe(nextLines, monthKey, categoryIds);
    }

    this.recurringRuleService.commitVersionChange(change);
    this._lines.set(nextLines);
  }

  /** Valide, avant toute mutation, les totaux prévus de chaque catégorie touchée et de leurs types. */
  private assertPlannedAggregatesSafe(
    lines: readonly BudgetLine[],
    monthKey: string,
    categoryIds: Iterable<string>,
  ): void {
    const categoryTypes = new Map<string, CategoryType>(
      this.categoryService.categories().map(category => [category.id, category.type]),
    );
    for (const categoryId of new Set(categoryIds)) {
      assertPlannedTotalsSafe(lines, monthKey, categoryId, categoryTypes);
    }
  }

  /**
   * Précontrôle synchrone et sans mutation d'un ajout de transaction. Doit être suivi immédiatement, sans attente,
   * de `TransactionService.add()` avec la même saisie.
   *
   * @throws Error si la date, le montant, la catégorie ou la sous-catégorie ne sont pas valides
   * @throws TransactionAggregateOverflowError si un total réel ou un solde propagé ne serait plus sûr
   */
  assertTransactionAddable(input: TransactionInput): void {
    assertValidTransactionInput(input);
    this.assertTransactionMutationSafe(null, this.footprintOfInput(input));
  }

  /**
   * Précontrôle synchrone et sans mutation d'une modification. Doit être suivi immédiatement, sans attente,
   * de `TransactionService.update()` avec le même `id` et la même saisie.
   *
   * @throws Error si la saisie n'est pas valide ou si la transaction est introuvable
   * @throws TransactionAggregateOverflowError si un total réel ou un solde propagé ne serait plus sûr
   */
  assertTransactionUpdatable(id: string, input: TransactionInput): void {
    assertValidTransactionInput(input);
    const current = this.findTransactionOrThrow(id);
    this.assertTransactionMutationSafe(current, this.footprintOfInput(input));
  }

  /**
   * Précontrôle synchrone et sans mutation d'une suppression. Doit être suivi immédiatement, sans attente,
   * de `TransactionService.remove()` avec le même `id`.
   *
   * @throws Error('Transaction not found') si la transaction est introuvable
   * @throws TransactionAggregateOverflowError si un solde propagé ne serait plus sûr
   */
  assertTransactionRemovable(id: string): void {
    this.assertTransactionMutationSafe(this.findTransactionOrThrow(id), null);
  }

  /**
   * Précontrôle synchrone et sans mutation d'une restauration. Doit être suivi immédiatement, sans attente,
   * de `TransactionService.restore()` avec la même valeur.
   *
   * @throws Error('Transaction already exists') si une transaction de même `id` est déjà présente
   * @throws TransactionAggregateOverflowError si un total réel ou un solde propagé ne serait plus sûr
   */
  assertTransactionRestorable(removed: RemovedTransaction): void {
    const alreadyPresent = this.transactionService
      .transactions()
      .some(transaction => transaction.id === removed.transaction.id);
    if (alreadyPresent) {
      throw new Error('Transaction already exists');
    }
    this.assertTransactionMutationSafe(null, removed.transaction);
  }

  private findTransactionOrThrow(id: string): Transaction {
    const transaction = this.transactionService.transactions().find(current => current.id === id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  private footprintOfInput(input: TransactionInput): TransactionFootprint {
    return {
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      monthKey: input.date.slice(0, 7),
      amountCents: input.amountCents,
      type: resolveTransactionType(input, this.categoryService),
    };
  }

  /**
   * Simule, sans rien modifier, le retrait d'une transaction (`removed`) puis l'ajout d'une autre (`added`).
   * Vérifie en BigInt les sommes réelles de la sous-catégorie, de la catégorie et du type des clés touchées,
   * puis compare la cascade des soldes d'ouverture et de clôture avant et après.
   */
  private assertTransactionMutationSafe(
    removed: Transaction | null,
    added: TransactionFootprint | null,
  ): void {
    const current: readonly Transaction[] = this.transactionService.transactions();
    const remaining = removed ? current.filter(transaction => transaction.id !== removed.id) : current;
    const after: readonly TransactionFootprint[] = added ? [...remaining, added] : remaining;
    const touched = [removed, added].filter(
      (footprint): footprint is TransactionFootprint => footprint !== null,
    );

    for (const footprint of touched) {
      const sumWhere = (predicate: (transaction: TransactionFootprint) => boolean): bigint =>
        after.reduce(
          (total, transaction) =>
            predicate(transaction) ? total + BigInt(transaction.amountCents) : total,
          BigInt(0),
        );
      const sameMonth = (transaction: TransactionFootprint): boolean =>
        transaction.monthKey === footprint.monthKey;

      const subcategoryTotal = sumWhere(
        transaction => sameMonth(transaction) && transaction.subcategoryId === footprint.subcategoryId,
      );
      const categoryTotal = sumWhere(
        transaction => sameMonth(transaction) && transaction.categoryId === footprint.categoryId,
      );
      const typeTotal = sumWhere(
        transaction => sameMonth(transaction) && transaction.type === footprint.type,
      );
      if (
        subcategoryTotal > MAX_SAFE_CENTS_BIGINT ||
        categoryTotal > MAX_SAFE_CENTS_BIGINT ||
        typeTotal > MAX_SAFE_CENTS_BIGINT
      ) {
        throw new TransactionAggregateOverflowError();
      }
    }

    const netBeforeByMonthKey = netByMonthKey(current);
    const netAfterByMonthKey = netByMonthKey(after);

    const months = [...this._months()].sort((left, right) =>
      left.monthKey.localeCompare(right.monthKey),
    );
    const affectedKeys = new Set<string>(touched.map(footprint => footprint.monthKey));
    for (const month of months) {
      affectedKeys.add(month.monthKey);
      affectedKeys.add(shiftMonthKey(month.monthKey, 1));
    }

    const balancesBefore = computeMonthBalances(months, netBeforeByMonthKey, affectedKeys);
    const balancesAfter = computeMonthBalances(months, netAfterByMonthKey, affectedKeys);
    for (const [key, balance] of balancesAfter) {
      const previous = balancesBefore.get(key);
      const openingChanged = previous?.openingCents !== balance.openingCents;
      const closingChanged = previous?.closingCents !== balance.closingCents;
      if (
        (openingChanged && !isSafeCentsBigInt(balance.openingCents)) ||
        (closingChanged && !isSafeCentsBigInt(balance.closingCents))
      ) {
        throw new TransactionAggregateOverflowError();
      }
    }
  }

  linesForMonth(monthKey: string): BudgetLine[] {
    this.assertValidMonthKey(monthKey);
    return this._lines().filter(line => line.monthKey === monthKey);
  }

  plannedCentsFor(monthKey: string, subcategoryId: string): number {
    const line = this._lines().find(
      current => current.monthKey === monthKey && current.subcategoryId === subcategoryId,
    );
    return line?.plannedAmountCents ?? 0;
  }

  /**
   * Initialise le mois et génère ses lignes récurrentes. Les candidates sont validées avec les lignes
   * existantes avant toute mutation : en cas de dépassement, rien n'est créé ni initialisé.
   *
   * @throws PlannedAggregateOverflowError si les totaux prévus du mois ne seraient plus représentables
   */
  openMonth(monthKey: string): OpenMonthResult {
    this.assertValidMonthKey(monthKey);

    const result: OpenMonthResult = { monthKey, created: 0, skipped: 0, ignoredRuleIds: [] };
    if (this.isMonthOpened(monthKey)) {
      return result;
    }

    const subcategories = this.categoryService.subcategories();
    const handledSubcategoryIds = new Set<string>();
    const generatedLines: BudgetLine[] = [];

    for (const rule of this.recurringRuleService.activeRulesForMonth(monthKey)) {
      const subcategory = subcategories.find(sub => sub.id === rule.subcategoryId);
      if (
        !subcategory ||
        subcategory.categoryId !== rule.categoryId ||
        !this.isValidRuleAmount(rule)
      ) {
        result.ignoredRuleIds.push(rule.id);
        continue;
      }

      if (handledSubcategoryIds.has(subcategory.id)) {
        result.ignoredRuleIds.push(rule.id);
        continue;
      }
      handledSubcategoryIds.add(subcategory.id);

      const isSuppressed = this._recurringRuleSuppressions().some(
        item =>
          item.monthKey === monthKey &&
          item.seriesId === rule.seriesId &&
          item.subcategoryId === subcategory.id,
      );
      if (isSuppressed) {
        result.skipped++;
        continue;
      }

      const alreadyExists = this._lines().some(
        line => line.monthKey === monthKey && line.subcategoryId === subcategory.id,
      );
      if (alreadyExists) {
        result.skipped++;
        continue;
      }

      generatedLines.push({
        id: crypto.randomUUID(),
        monthKey,
        categoryId: subcategory.categoryId,
        subcategoryId: subcategory.id,
        plannedAmountCents: rule.amountCents,
        sourceRuleId: rule.id,
      });
      result.created++;
    }

    const openingBalanceCents = this.automaticOpeningCentsFor(monthKey);

    if (generatedLines.length > 0) {
      const currentLines = this._lines();
      const nextLines = [...currentLines, ...generatedLines];
      this.assertPlannedAggregatesSafe(
        nextLines,
        monthKey,
        generatedLines.map(line => line.categoryId),
      );
      this._lines.set(nextLines);
    }

    this._months.update(months => [
      ...months,
      { monthKey, openingBalanceCents, openingBalanceOverridden: false, initialized: true },
    ]);

    return result;
  }

  isMonthOpened(monthKey: string): boolean {
    return this._months().some(month => month.monthKey === monthKey && month.initialized);
  }

  /** Clôture budgétée du mois affiché pour un solde d'ouverture donné (brouillon d'édition, sans enregistrement). */
  previewBudgetedClosingBalanceCents(openingBalanceCents: number): number | null {
    const summary = this.monthSummary();
    return budgetedClosingCents(
      openingBalanceCents,
      summary.incomePlannedCents,
      summary.expensePlannedCents,
    );
  }

  openingBalanceCentsFor(monthKey: string): number {
    this.assertValidMonthKey(monthKey);
    return this.openingCentsFor(monthKey);
  }

  actualClosingBalanceCentsFor(monthKey: string): number {
    this.assertValidMonthKey(monthKey);
    return this.closingCentsFor(monthKey);
  }

  setOpeningBalanceOverride(monthKey: string, openingBalanceCents: number): BudgetMonth {
    this.assertValidMonthKey(monthKey);
    this.assertMonthInitialized(monthKey);
    if (!Number.isInteger(openingBalanceCents)) {
      throw new Error('Invalid opening balance');
    }

    this._months.update(months =>
      months.map(month =>
        month.monthKey === monthKey
          ? { ...month, openingBalanceCents, openingBalanceOverridden: true }
          : month,
      ),
    );

    return this.resolvedMonth(monthKey);
  }

  clearOpeningBalanceOverride(monthKey: string): BudgetMonth {
    this.assertValidMonthKey(monthKey);
    this.assertMonthInitialized(monthKey);

    const openingBalanceCents = this.automaticOpeningCentsFor(monthKey);
    this._months.update(months =>
      months.map(month =>
        month.monthKey === monthKey
          ? { ...month, openingBalanceCents, openingBalanceOverridden: false }
          : month,
      ),
    );

    return this.resolvedMonth(monthKey);
  }

  private openingCentsFor(monthKey: string): number {
    const month = this.resolvedMonths().months.find(current => current.monthKey === monthKey);
    return month ? month.openingBalanceCents : this.automaticOpeningCentsFor(monthKey);
  }

  private automaticOpeningCentsFor(monthKey: string): number {
    return this.resolvedMonths().closingCentsByMonthKey.get(previousMonthKey(monthKey)) ?? 0;
  }

  private closingCentsFor(monthKey: string): number {
    return this.openingCentsFor(monthKey) + netCents(this.actualTotalsByMonthKey().get(monthKey));
  }

  private resolvedMonth(monthKey: string): BudgetMonth {
    const month = this.resolvedMonths().months.find(current => current.monthKey === monthKey);
    if (!month) {
      throw new Error('Budget month not initialized');
    }
    return month;
  }

  private assertMonthInitialized(monthKey: string): void {
    if (!this.isMonthOpened(monthKey)) {
      throw new Error('Budget month not initialized');
    }
  }

  private isValidRuleAmount(rule: RecurringRule): boolean {
    return Number.isSafeInteger(rule.amountCents) && rule.amountCents > 0;
  }

  private assertValidMonthKey(monthKey: string): void {
    if (!MONTH_KEY_PATTERN.test(monthKey)) {
      throw new Error('Invalid month key format');
    }
  }
}
