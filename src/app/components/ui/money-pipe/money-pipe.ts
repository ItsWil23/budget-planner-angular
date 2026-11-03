import { Pipe, PipeTransform } from '@angular/core';
import { CategoryType } from '../../../models/category';
import { UserSettings } from '../../../models/user-settings';
import { MoneyService } from '../../../services/money';

const MINUS_SIGN = '\u2212';

@Pipe({
  name: 'money',
})
export class MoneyPipe implements PipeTransform {
  constructor(private readonly moneyService: MoneyService) {}

  transform(
    amountCents: number,
    settings: Pick<UserSettings, 'currency' | 'locale'>,
    type?: CategoryType,
  ): string {
    if (!Number.isInteger(amountCents)) {
      throw new Error('Invalid amount');
    }

    const signedCents: number = this.signedCents(amountCents, type);
    const formatter = new Intl.NumberFormat(settings.locale, {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: type ? 'always' : 'auto',
    });

    // Intl émet un tiret ASCII ; le signe affiché est le moins typographique U+2212 (DESIGN_SYSTEM § 4.1).
    return formatter.format(this.moneyService.toEuros(signedCents)).replace('-', MINUS_SIGN);
  }

  private signedCents(amountCents: number, type?: CategoryType): number {
    if (type === 'income') return Math.abs(amountCents);
    if (type === 'expense') return -Math.abs(amountCents);
    return amountCents;
  }
}
