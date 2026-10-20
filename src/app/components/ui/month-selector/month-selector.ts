import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MonthContextService } from '../../../services/month-context';

@Component({
  selector: 'app-month-selector',
  imports: [TranslocoPipe],
  templateUrl: './month-selector.html',
  styleUrl: './month-selector.scss',
})
export class MonthSelector {
  private readonly monthContext = inject(MonthContextService);
  private readonly transloco = inject(TranslocoService);

  protected readonly isCurrentMonth = this.monthContext.isCurrentMonth;

  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  private readonly formatter = computed(
    () => new Intl.DateTimeFormat(this.activeLang(), { month: 'long', year: 'numeric' }),
  );

  protected readonly monthLabel = computed(() => this.formatMonth(this.monthContext.monthKey()));

  protected readonly reservedLabels = computed(() => {
    const year = this.monthContext.monthKey().slice(0, 4);
    return Array.from({ length: 12 }, (_, index) =>
      this.formatMonth(`${year}-${String(index + 1).padStart(2, '0')}`),
    );
  });

  private formatMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    const label = this.formatter().format(new Date(year, month - 1, 1));
    return label.charAt(0).toLocaleUpperCase(this.activeLang()) + label.slice(1);
  }

  protected previousMonth(): void {
    this.monthContext.shiftMonth(-1);
  }

  protected nextMonth(): void {
    this.monthContext.shiftMonth(1);
  }

  protected goToToday(): void {
    this.monthContext.resetToCurrentMonth();
  }
}
