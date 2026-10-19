import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MonthContextService {
  private readonly _monthKey = signal<string>(this.getInitialMonth());
  readonly monthKey = this._monthKey.asReadonly();

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
}
