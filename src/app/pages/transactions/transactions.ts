import { Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TransactionList } from '../../components/ui/transaction-list/transaction-list';
import { CategoryService } from '../../services/category';
import { RemovedTransaction, TransactionInput, TransactionPresentation } from '../../models/transactions';
import { Modal } from '../../components/ui/modal/modal';
import { TransactionForm } from '../../components/ui/transaction-form/transaction-form';
import { UndoToast } from '../../components/ui/undo-toast/undo-toast';
import { TransactionService } from '../../services/transaction';
import { BudgetService, TransactionAggregateOverflowError } from '../../services/budget';
import { MonthContextService } from '../../services/month-context';

interface UndoNotice {
  id: number;
  message: string;
  removed: RemovedTransaction | null;
}

@Component({
  selector: 'app-transactions',
  imports: [
    TransactionList,
    Modal,
    TransactionForm,
    UndoToast,
    TranslocoPipe,
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class Transactions {
  protected readonly isModalOpened = signal(false);
  protected readonly aggregateOverflow = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly deleteTarget = signal<TransactionPresentation | null>(null);
  protected readonly notices = signal<UndoNotice[]>([]);
  protected readonly transactionService = inject(TransactionService);
  protected readonly budgetService = inject(BudgetService);
  private readonly transloco = inject(TranslocoService);
  private readonly newButton = viewChild<ElementRef<HTMLButtonElement>>('newButton');
  private noticeCounter = 0;

  protected readonly monthContext = inject(MonthContextService);
  protected readonly transactions = computed(() =>
    this.transactionService.transactionsForMonth(this.monthContext.monthKey()),
  );
  protected readonly editingTransaction = computed(() => {
    const id = this.editingId();
    return id ? (this.transactions().find(transaction => transaction.id === id) ?? null) : null;
  });
  protected readonly categoryService = inject(CategoryService);
  protected readonly categories = this.categoryService.categories;
  protected readonly subcategories = this.categoryService.subcategories;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  onTransactionSubmit(transaction: TransactionInput): void {
    const editedId = this.editingId();
    if (editedId) {
      this.submitEdit(editedId, transaction);
      return;
    }

    if (!this.precheck(() => this.budgetService.assertTransactionAddable(transaction))) return;

    const added = this.transactionService.add(transaction);
    this.monthContext.setMonth(added.monthKey);
    this.closeModal();
  }

  onTransactionDraftChange(): void {
    this.aggregateOverflow.set(false);
  }

  onTransactionCancel(): void {
    this.closeModal();
  }

  onModalClosed(): void {
    this.closeModal();
  }

  openModal(): void {
    this.editingId.set(null);
    this.aggregateOverflow.set(false);
    this.isModalOpened.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.aggregateOverflow.set(false);
    this.isModalOpened.set(true);
  }

  onTransactionDelete(id: string): void {
    this.deleteTarget.set(this.transactions().find(transaction => transaction.id === id) ?? null);
  }

  cancelDelete(): void {
    const target = this.deleteTarget();
    this.deleteTarget.set(null);
    if (target) this.focusRowMenu(target.id);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleteTarget.set(null);

    const refused = (): void => this.replaceNotices(this.transloco.translate('transactions.deleteRefused'), null);
    if (!this.precheck(() => this.budgetService.assertTransactionRemovable(target.id), refused)) return;

    const removed = this.transactionService.remove(target.id);
    this.replaceNotices(
      this.transloco.translate('transactions.deleted', { label: target.label }),
      removed,
    );
  }

  undoDelete(notice: UndoNotice): void {
    const removed = notice.removed;
    if (!removed) return;

    // Le refus garde la même notification : le bouton reste et le délai initial continue sans redémarrer.
    const refused = (): void => this.setNoticeMessage(notice.id, this.transloco.translate('transactions.deleteRefused'));
    if (!this.precheck(() => this.budgetService.assertTransactionRestorable(removed), refused)) return;

    this.transactionService.restore(removed);
    this.removeNotice(notice.id);
  }

  private setNoticeMessage(id: number, message: string): void {
    this.notices.update(notices => notices.map(notice => (notice.id === id ? { ...notice, message } : notice)));
  }

  removeNotice(id: number): void {
    const toastHadFocus = this.isFocusInToast();
    this.notices.update(notices => notices.filter(notice => notice.id !== id));
    if (toastHadFocus) this.focusNewButton();
  }

  // Une nouvelle notification remplace la précédente : une annulation en attente devient définitive.
  private replaceNotices(message: string, removed: RemovedTransaction | null): void {
    const toastHadFocus = this.isFocusInToast();
    this.noticeCounter += 1;
    this.notices.set([{ id: this.noticeCounter, message, removed }]);
    // Une notification avec bouton prend le focus elle-même ; sans bouton, le focus revient à « Nouvelle transaction ».
    if (toastHadFocus && removed === null) this.focusNewButton();
  }

  private isFocusInToast(): boolean {
    const toast: HTMLElement | null = this.host.nativeElement.querySelector('app-undo-toast');
    return toast?.contains(document.activeElement) ?? false;
  }

  private focusNewButton(): void {
    afterNextRender(() => this.newButton()?.nativeElement.focus(), { injector: this.injector });
  }

  private submitEdit(id: string, input: TransactionInput): void {
    if (!this.precheck(() => this.budgetService.assertTransactionUpdatable(id, input))) return;

    const updated = this.transactionService.update(id, input);
    this.monthContext.setMonth(updated.monthKey);
    this.closeModal();
  }

  // Renvoie false si l'opération dépasse les totaux agrégés : la modale reste ouverte avec le brouillon.
  private precheck(
    check: () => void,
    onRefused: () => void = () => this.aggregateOverflow.set(true),
  ): boolean {
    try {
      check();
      return true;
    } catch (error: unknown) {
      if (error instanceof TransactionAggregateOverflowError) {
        onRefused();
        return false;
      }
      throw error;
    }
  }

  private closeModal(): void {
    const editedId = this.editingId();
    this.aggregateOverflow.set(false);
    this.editingId.set(null);
    this.isModalOpened.set(false);
    if (editedId) this.focusRowMenu(editedId);
  }

  // La modale rend le focus à l'élément qui l'a ouverte, déjà retiré du DOM après un menu de ligne :
  // on le replace sur le déclencheur du menu de la ligne éditée, si elle est toujours affichée.
  private focusRowMenu(id: string): void {
    afterNextRender(
      () => {
        const triggers = this.host.nativeElement.querySelectorAll<HTMLElement>('[data-menu-trigger]');
        Array.from(triggers).find(trigger => trigger.dataset['menuTrigger'] === id)?.focus();
      },
      { injector: this.injector },
    );
  }
}
