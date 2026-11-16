import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MonthContextService {
  readonly systemMonthKey = this.getInitialMonth();
  readonly nextSystemMonthKey = this.shiftMonthKey(this.systemMonthKey, 1);
  private readonly _monthKey = signal<string>(this.systemMonthKey);
  readonly monthKey = this._monthKey.asReadonly();
  readonly isCurrentMonth = computed(() => this._monthKey() === this.systemMonthKey);

  private validateMonthKey(monthKey: string): void {
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!regex.test(monthKey)) {
      throw new Error('Invalid month key format');
    }
  }

  private getInitialMonth(): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  setMonth(monthKey: string): void {
    this.validateMonthKey(monthKey);
    this._monthKey.set(monthKey);
  }

  shiftMonth(delta: number): void {
    this.setMonth(this.shiftMonthKey(this._monthKey(), delta));
  }

  private shiftMonthKey(monthKey: string, delta: number): string {
    const [year, month] = monthKey.split('-').map(Number);
    const monthIndex = year * 12 + (month - 1) + delta;
    const shiftedYear = Math.floor(monthIndex / 12);
    const shiftedMonth = (monthIndex % 12) + 1;
    return `${String(shiftedYear).padStart(4, '0')}-${String(shiftedMonth).padStart(2, '0')}`;
  }

  resetToCurrentMonth(): void {
    this._monthKey.set(this.systemMonthKey);
  }
}
