import { Component, ElementRef, HostListener, Injector, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

interface PickerCell {
  readonly key: string;
  readonly label: string;
  readonly selected: boolean;
  readonly disabled: boolean;
}

@Component({
  selector: 'app-month-picker',
  imports: [TranslocoPipe],
  templateUrl: './month-picker.html',
  styleUrl: './month-picker.scss',
})
export class MonthPicker {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly fieldId = input.required<string>();
  /** Mois sélectionné au format AAAA-MM ; chaîne vide quand aucune fin n'est définie. */
  readonly value = input('');
  /** Premier mois sélectionnable, au format AAAA-MM. */
  readonly minMonth = input.required<string>();
  /** Mois affiché à l'ouverture quand aucune valeur n'est sélectionnée. */
  readonly defaultMonth = input.required<string>();
  readonly locale = input.required<string>();
  readonly placeholder = input.required<string>();
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);
  readonly valueChange = output<string>();

  protected readonly open = signal(false);
  protected readonly view = signal<'months' | 'years'>('months');
  protected readonly viewYear = signal(0);
  protected readonly panelId = computed(() => `${this.fieldId()}-panel`);
  protected readonly valueId = computed(() => `${this.fieldId()}-value`);
  protected readonly selectedKey = computed(() => (MONTH_KEY_PATTERN.test(this.value()) ? this.value() : ''));
  protected readonly displayText = computed(() =>
    this.selectedKey() ? this.formatMonth(this.selectedKey(), { month: 'long', year: 'numeric' }) : this.placeholder(),
  );
  protected readonly yearStart = computed(() => Math.floor(this.viewYear() / 12) * 12);
  protected readonly rangeLabel = computed(() => `${this.yearStart()} – ${this.yearStart() + 11}`);
  protected readonly monthCells = computed<PickerCell[]>(() => {
    const year = this.viewYear();
    return Array.from({ length: 12 }, (_, index) => {
      const key = `${year}-${String(index + 1).padStart(2, '0')}`;
      return {
        key,
        label: this.formatMonth(key, { month: 'short' }),
        selected: key === this.selectedKey(),
        disabled: key < this.minMonth(),
      };
    });
  });
  protected readonly yearCells = computed<PickerCell[]>(() => {
    const selectedYear = this.selectedKey().slice(0, 4);
    const minYear = this.minMonth().slice(0, 4);
    return Array.from({ length: 12 }, (_, index) => {
      const year = String(this.yearStart() + index);
      return { key: year, label: year, selected: year === selectedYear, disabled: year < minYear };
    });
  });

  @HostListener('keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    if (!this.open()) return;
    event.preventDefault();
    event.stopPropagation();
    this.close(true);
  }

  @HostListener('document:pointerdown', ['$event.target'])
  protected onDocumentPointerDown(target: EventTarget | null): void {
    if (target instanceof Node && !this.host.nativeElement.contains(target)) this.close(false);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || this.host.nativeElement.contains(next)) return;
    this.close(false);
  }

  protected toggle(): void {
    if (this.open()) {
      this.close(true);
      return;
    }
    this.viewYear.set(Number((this.selectedKey() || this.defaultMonth()).slice(0, 4)));
    this.view.set('months');
    this.open.set(true);
    this.focusCurrentCell();
  }

  protected toggleView(): void {
    this.view.update(current => (current === 'months' ? 'years' : 'months'));
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('.picker-title')?.focus(), {
      injector: this.injector,
    });
  }

  protected shiftPage(direction: -1 | 1): void {
    const step = this.view() === 'months' ? 1 : 12;
    this.viewYear.update(year => year + direction * step);
  }

  protected selectYear(cell: PickerCell): void {
    if (cell.disabled) return;
    this.viewYear.set(Number(cell.key));
    this.view.set('months');
    this.focusCurrentCell();
  }

  protected selectMonth(cell: PickerCell): void {
    if (cell.disabled) return;
    this.valueChange.emit(cell.key);
    this.close(true);
  }

  protected dismiss(): void {
    this.close(true);
  }

  protected clear(): void {
    this.valueChange.emit('');
    this.close(true);
  }

  private close(restoreFocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) this.trigger().nativeElement.focus();
  }

  private focusCurrentCell(): void {
    afterNextRender(
      () => {
        const panel = this.host.nativeElement.querySelector<HTMLElement>('.picker-panel');
        const target =
          panel?.querySelector<HTMLElement>('[aria-pressed="true"]:not([aria-disabled="true"])') ??
          panel?.querySelector<HTMLElement>('.picker-cell:not([aria-disabled="true"])');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  private formatMonth(monthKey: string, options: Intl.DateTimeFormatOptions): string {
    const [year, month] = monthKey.split('-').map(Number);
    return new Intl.DateTimeFormat(this.locale(), options).format(new Date(year, month - 1, 1));
  }
}
