import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { ReactiveFormsModule, Validators, FormBuilder, FormControl } from '@angular/forms';
import { Category, Subcategory } from '../../../models/category';
import { TransactionInput } from '../../../models/transactions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-transaction-form',
  imports: [ReactiveFormsModule],
  templateUrl: './transaction-form.html',
  styleUrl: './transaction-form.scss',
})
export class TransactionForm {
  @Input() formCategories: Category[] = [];
  @Input() formSubcategories: Subcategory[] = [];

  @Output() transactionSubmit = new EventEmitter<TransactionInput>();
  @Output() cancel = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);
  protected filteredSubcategories: Subcategory[] = [];

  newTransactionForm = this.formBuilder.nonNullable.group({
    categoryId: ['', Validators.required],
    subcategoryId: ['', Validators.required],
    label: ['', Validators.required],
    amountEuros: new FormControl<number | null>(null, [Validators.required, Validators.min(0.1)]),
    date: [new Date().toISOString().substring(0, 10), Validators.required],
  });

  constructor() {
    this.newTransactionForm.controls.categoryId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((categoryId: string) => {
        this.filteredSubcategories = this.formSubcategories.filter(
          (subcategory: Subcategory) => subcategory.categoryId === categoryId,
        );
        this.newTransactionForm.controls.subcategoryId.setValue('');
      });
  }

  protected onSubmitTransactionForm(): void {
    if (!this.newTransactionForm.valid) {
      this.newTransactionForm.markAllAsTouched();
      return;
    }

    const validForm = this.newTransactionForm.getRawValue();
    if (validForm.amountEuros === null) return;
    const newTransactionType = this.getCategoryById(validForm.categoryId).type;
    const newTransaction: TransactionInput = {
      id: crypto.randomUUID(),
      ...validForm,
      amountEuros: validForm.amountEuros,
      type: newTransactionType,
    };

    this.transactionSubmit.emit(newTransaction);

    this.newTransactionForm.reset();
  }

  private getCategoryById(categoryId: string): Category {
    const foundCategory: Category | undefined = this.formCategories.find(
      (category: Category) => category.id === categoryId,
    );
    if (!foundCategory) throw new Error('Category not found');
    return foundCategory;
  }
}
