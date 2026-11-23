import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { Category, Subcategory } from '../../../models/category';
import { TransactionPresentation } from '../../../models/transactions';
import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { SettingsService } from '../../../services/settings';
import { MoneyPipe } from '../money-pipe/money-pipe';
import { RowMenu } from '../row-menu/row-menu';

/* Coupe après un séparateur de groupe (espace fine, espace insécable, virgule ou point) suivi d'un groupe de 3 chiffres.
 * Les centimes (2 chiffres) et les chiffres eux-mêmes ne sont jamais coupés. */
const AMOUNT_GROUP_BREAK: RegExp = /(?<=\d[\s,.])(?=\d{3}(?!\d))/;

export function splitAmountGroups(formatted: string): string[] {
  return formatted.split(AMOUNT_GROUP_BREAK);
}

@Component({
  selector: 'app-transaction-list',
  imports: [
    DatePipe,
    TranslocoPipe,
    MoneyPipe,
    RowMenu,
  ],
  templateUrl: './transaction-list.html',
  styleUrl: './transaction-list.scss',
})
export class TransactionList implements OnChanges {
  @Input() transactions: TransactionPresentation[] = [];
  @Input() categories: Category[] = [];
  @Input() subcategories: Subcategory[] = [];
  @Input() readOnly = false;

  @Output() editTransaction = new EventEmitter<TransactionPresentation>();
  @Output() deleteTransaction = new EventEmitter<string>();

  protected readonly settings = inject(SettingsService).settings;
  protected readonly expandedId = signal<string | null>(null);
  protected readonly amountGroups = splitAmountGroups;

  ngOnChanges(changes: SimpleChanges): void {
    const currentId: string | null = this.expandedId();
    if (changes['transactions'] && currentId !== null) {
      const stillListed: boolean = this.transactions.some(
        (transaction: TransactionPresentation) => transaction.id === currentId,
      );
      if (!stillListed) this.expandedId.set(null);
    }
  }

  protected isExpanded(transactionId: string): boolean {
    return this.expandedId() === transactionId;
  }

  protected toggleDetails(transactionId: string): void {
    this.expandedId.update((current: string | null) =>
      current === transactionId ? null : transactionId,
    );
  }

  protected detailsId(transactionId: string): string {
    return `transaction-details-${transactionId}`;
  }

  protected labelId(transactionId: string): string {
    return `transaction-label-${transactionId}`;
  }

  protected getCategoryById(categoryId: string): Category {
    const foundCategory: Category | undefined = this.categories.find(
      (category: Category) => category.id === categoryId,
    );
    if (!foundCategory) throw new Error('Category not found');
    return foundCategory;
  }

  protected getSubcategoryById(subcategoryId: string): Subcategory {
    const foundSubcategory: Subcategory | undefined = this.subcategories.find(
      (subcategory: Subcategory) => subcategory.id === subcategoryId,
    );
    if (!foundSubcategory) throw new Error('Subcategory not found');
    return foundSubcategory;
  }
}
