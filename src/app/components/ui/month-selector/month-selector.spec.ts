import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';

import { MonthSelector } from './month-selector';
import { MonthContextService } from '../../../services/month-context';

describe('MonthSelector', () => {
  let fixture: ComponentFixture<MonthSelector>;
  let monthContext: MonthContextService;
  let transloco: TranslocoService;

  const label = (): string =>
    (fixture.nativeElement as HTMLElement).querySelector('.month-label-value')?.textContent?.trim() ?? '';
  const button = (selector: string): HTMLButtonElement | null =>
    fixture.nativeElement.querySelector(selector);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MonthSelector,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              monthSelector: { previous: 'Mois précédent', next: 'Mois suivant', today: "Aujourd'hui" },
            },
            en: {
              monthSelector: { previous: 'Previous month', next: 'Next month', today: 'Today' },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    monthContext = TestBed.inject(MonthContextService);
    transloco = TestBed.inject(TranslocoService);

    fixture = TestBed.createComponent(MonthSelector);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the month in French', () => {
    monthContext.setMonth('2026-10');
    fixture.detectChanges();

    expect(label()).toBe('Octobre 2026');
  });

  it('should display the month in English when the active language is English', async () => {
    transloco.setActiveLang('en');
    monthContext.setMonth('2026-10');
    fixture.detectChanges();

    expect(label()).toBe('October 2026');
  });

  it('should render twelve hidden reserved labels for the year of the displayed month', () => {
    monthContext.setMonth('2026-10');
    fixture.detectChanges();

    const reserved = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.month-label-reserve'),
    );
    expect(reserved.length).toBe(12);
    expect(reserved.every(element => element.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(reserved.map(element => element.textContent?.trim())).toEqual(
      expect.arrayContaining(['Janvier 2026', 'Octobre 2026', 'Décembre 2026']),
    );
  });

  it('should expose translated labels on the navigation buttons', () => {
    expect(button('.month-button[aria-label="Mois précédent"]')).toBeTruthy();
    expect(button('.month-button[aria-label="Mois suivant"]')).toBeTruthy();
  });

  it('should hide the today button when the displayed month is the current month', () => {
    expect(button('.today-button')).toBeNull();
  });

  it('should show the today button when another month is displayed', () => {
    monthContext.shiftMonth(1);
    fixture.detectChanges();

    expect(button('.today-button')).toBeTruthy();
  });

  it('should move to the next month when the next button is clicked', () => {
    monthContext.setMonth('2026-10');
    fixture.detectChanges();

    button('.month-button[aria-label="Mois suivant"]')?.click();
    fixture.detectChanges();

    expect(monthContext.monthKey()).toBe('2026-11');
    expect(label()).toBe('Novembre 2026');
  });

  it('should move to the previous month across the year boundary', () => {
    monthContext.setMonth('2026-01');
    fixture.detectChanges();

    button('.month-button[aria-label="Mois précédent"]')?.click();
    fixture.detectChanges();

    expect(monthContext.monthKey()).toBe('2025-12');
    expect(label()).toBe('Décembre 2025');
  });

  it('should return to the current month and hide the today button when it is clicked', () => {
    const currentMonth = monthContext.monthKey();
    monthContext.shiftMonth(-3);
    fixture.detectChanges();

    button('.today-button')?.click();
    fixture.detectChanges();

    expect(monthContext.monthKey()).toBe(currentMonth);
    expect(button('.today-button')).toBeNull();
  });
});
