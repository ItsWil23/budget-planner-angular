import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
  FormBuilder,
} from '@angular/forms';
import { Category, Subcategory } from '../../../models/category';
import { Transaction, TransactionInput } from '../../../models/transactions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { MoneyService } from '../../../services/money';
import { SettingsService } from '../../../services/settings';
import { todayLocalIsoDate } from '../../../services/transaction';

@Component({
  selector: 'app-transaction-form',
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './transaction-form.html',
  styleUrl: './transaction-form.scss',
})
export class TransactionForm implements OnInit {
  @Input() formCategories: Category[] = [];
  @Input() formSubcategories: Subcategory[] = [];
  @Input() aggregateOverflow = false;
  @Input() transaction: Transaction | null = null;

  @Output() transactionSubmit = new EventEmitter<TransactionInput>();
  @Output() draftChange = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly moneyService = inject(MoneyService);
  private readonly settings = inject(SettingsService).settings;
  protected filteredSubcategories: Subcategory[] = [];
  protected readonly amountErrorId = 'transactionAmountError';
  protected readonly aggregateErrorId = 'transactionAggregateError';

  newTransactionForm = this.formBuilder.nonNullable.group({
    categoryId: ['', Validators.required],
    subcategoryId: ['', Validators.required],
    label: ['', Validators.required],
    amountText: ['', [(control: AbstractControl) => this.amountErrors(control.value)]],
    date: [todayLocalIsoDate(), Validators.required],
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

    this.newTransactionForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.draftChange.emit());
  }

  ngOnInit(): void {
    const transaction = this.transaction;
    if (!transaction) return;

    // La catégorie d'abord : son changement réinitialise la sous-catégorie.
    const controls = this.newTransactionForm.controls;
    controls.categoryId.setValue(transaction.categoryId);
    controls.subcategoryId.setValue(transaction.subcategoryId);
    controls.label.setValue(transaction.label);
    controls.amountText.setValue(
      this.moneyService.toEditableString(transaction.amountCents, this.settings().locale),
    );
    controls.date.setValue(transaction.date);
  }

  protected amountErrorKey(): string | null {
    const control = this.newTransactionForm.controls.amountText;
    if (!control.touched || control.valid) return null;
    return control.hasError('amountTooLarge')
      ? 'transactionForm.amountTooLarge'
      : 'transactionForm.amountInvalid';
  }

  protected onSubmitTransactionForm(): void {
    const amountCents = this.parsePositiveCents(this.newTransactionForm.controls.amountText.value);
    if (!this.newTransactionForm.valid || amountCents === null) {
      this.newTransactionForm.markAllAsTouched();
      return;
    }

    const validForm = this.newTransactionForm.getRawValue();
    const newTransaction: TransactionInput = {
      categoryId: validForm.categoryId,
      subcategoryId: validForm.subcategoryId,
      label: validForm.label,
      date: validForm.date,
      amountCents,
    };

    this.transactionSubmit.emit(newTransaction);
  }

  private amountErrors(raw: string): ValidationErrors | null {
    const parsed = this.moneyService.parseEurosInput(raw);
    if (!parsed.valid) {
      return parsed.error === 'tooLarge' ? { amountTooLarge: true } : { amountInvalid: true };
    }
    return parsed.cents > 0 ? null : { amountInvalid: true };
  }

  private parsePositiveCents(raw: string): number | null {
    const parsed = this.moneyService.parseEurosInput(raw);
    return parsed.valid && parsed.cents > 0 ? parsed.cents : null;
  }
}
