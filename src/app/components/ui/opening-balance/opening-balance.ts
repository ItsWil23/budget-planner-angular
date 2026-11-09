import { DOCUMENT } from '@angular/common';
import { Component, Injector, afterNextRender, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { UserSettings } from '../../../models/user-settings';
import { EurosInputError, MoneyService } from '../../../services/money';
import { MoneyPipe } from '../money-pipe/money-pipe';

const FIELD_ID = 'budget-opening-input';
const ADJUST_ID = 'budget-opening-adjust';
const ERROR_ID = 'budget-opening-error';
const HINT_ID = 'budget-opening-hint';
const PREPARE_ERROR_ID = 'budget-opening-prepare-error';

/** Bascule le signe d'un brouillon sans en modifier les chiffres. */
function toggleSignOf(raw: string): string {
  const trimmed = raw.trim().replace('\u2212', '-');
  return trimmed.startsWith('-') ? trimmed.slice(1) : `-${trimmed}`;
}

@Component({
  selector: 'app-opening-balance',
  imports: [MoneyPipe, TranslocoPipe],
  templateUrl: './opening-balance.html',
  styleUrl: './opening-balance.scss',
})
export class OpeningBalance {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly moneyService = inject(MoneyService);

  readonly opened = input.required<boolean>();
  readonly balanceCents = input.required<number>();
  readonly overridden = input.required<boolean>();
  readonly settings = input.required<UserSettings>();
  /** Solde courant en euros modifiables, pré-rempli à l'ouverture de l'éditeur. */
  readonly editableBalance = input.required<string>();
  /** Préparation du mois refusée (dépassement d'agrégat) : le mois reste non préparé. */
  readonly prepareFailed = input.required<boolean>();

  readonly prepareMonth = output<void>();
  /** Solde saisi, en centimes entiers exacts. */
  readonly balanceSave = output<number>();
  readonly balanceReset = output<void>();

  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  protected readonly editError = signal<EurosInputError | null>(null);
  protected readonly fieldId = FIELD_ID;
  protected readonly errorId = ERROR_ID;
  protected readonly hintId = HINT_ID;
  protected readonly adjustId = ADJUST_ID;
  protected readonly prepareErrorId = PREPARE_ERROR_ID;

  protected onAdjust(): void {
    if (!this.opened()) return;
    this.draft.set(this.editableBalance());
    this.editError.set(null);
    this.editing.set(true);
    afterNextRender(() => this.document.getElementById(FIELD_ID)?.focus(), { injector: this.injector });
  }

  protected onCommit(raw: string): void {
    const parsed = this.moneyService.parseEurosInput(raw);
    if (!parsed.valid) {
      this.editError.set(parsed.error);
      return;
    }
    this.closeEditor();
    this.balanceSave.emit(parsed.cents);
    this.focusAdjust();
  }

  protected onCancel(): void {
    if (!this.editing()) return;
    this.closeEditor();
    this.focusAdjust();
  }

  protected onToggleSign(field: HTMLInputElement): void {
    field.value = toggleSignOf(field.value);
    field.focus();
  }

  /** Le blur annule l'ajustement, sauf si le focus reste dans l'éditeur (champ ou bascule de signe). */
  protected onEditorBlur(event: FocusEvent): void {
    if (!this.editing()) return;
    const editor = event.target instanceof Element ? event.target.closest('.opening-edit') : null;
    if (event.relatedTarget instanceof Node && editor?.contains(event.relatedTarget)) return;
    this.closeEditor();
  }

  protected onPrepare(): void {
    this.prepareMonth.emit();
    this.focusAdjust();
  }

  protected onReset(): void {
    this.closeEditor();
    this.balanceReset.emit();
    this.focusAdjust();
  }

  private closeEditor(): void {
    this.editing.set(false);
    this.editError.set(null);
  }

  private focusAdjust(): void {
    afterNextRender(() => this.document.getElementById(ADJUST_ID)?.focus(), { injector: this.injector });
  }
}
