import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Category, Subcategory } from '../../../models/category';
import { TransactionPresentation } from '../../../models/transactions';
import { DatePipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-transaction-list',
  imports: [
    DatePipe,
    CurrencyPipe,
  ],
  templateUrl: './transaction-list.html',
  styleUrl: './transaction-list.scss',
})
export class TransactionList {
  @Input() transactions: TransactionPresentation[] = [];
  @Input() categories: Category[] = [];
  @Input() subcategories: Subcategory[] = [];
  @Input() readOnly = false;

  @Output() editTransaction = new EventEmitter<TransactionPresentation>();
  @Output() deleteTransaction = new EventEmitter<string>();

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
