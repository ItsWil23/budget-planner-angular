import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetLineStatus } from '../../../models/budget-status';
import { SettingsService } from '../../../services/settings';
import { ProgressBar } from './progress-bar';

describe('ProgressBar', () => {
  let fixture: ComponentFixture<ProgressBar>;
  let settings: SettingsService;
  const ariaLabel = 'Consommation du budget Alimentation';

  const formatPercent = (rate: number, locale: string): string =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(rate);

  const host = (): HTMLElement => fixture.nativeElement;

  const query = (selector: string): HTMLElement => {
    const element = host().querySelector<HTMLElement>(selector);
    if (!element) {
      throw new Error(`Missing element: ${selector}`);
    }
    return element;
  };

  const render = (
    consumptionRate: number,
    status: BudgetLineStatus,
    ariaValueText: string,
  ): void => {
    fixture.componentRef.setInput('consumptionRate', consumptionRate);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('ariaLabel', ariaLabel);
    fixture.componentRef.setInput('ariaValueText', ariaValueText);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressBar],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressBar);
    settings = TestBed.inject(SettingsService);
  });

  it('should create', () => {
    render(0.62, 'under', '62 % consommé, dans le budget');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render an under-budget line with exact label, 62 % fill and matching ARIA', () => {
    render(0.62, 'under', '62 % consommé, dans le budget');

    expect(query('.percent').textContent.trim()).toBe(formatPercent(0.62, 'fr-FR'));
    expect(query('.fill').style.width).toBe('62%');
    expect(query('.fill').classList.contains('under')).toBe(true);
    expect(query('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('62');
  });

  it('should render an on-track line with exact label, 89 % fill and on-track class', () => {
    render(0.89, 'on-track', '89 % consommé, proche du budget');

    expect(query('.percent').textContent.trim()).toBe(formatPercent(0.89, 'fr-FR'));
    expect(query('.fill').style.width).toBe('89%');
    expect(query('.fill').classList.contains('on-track')).toBe(true);
    expect(query('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('89');
  });

  it('should show the uncapped exact percentage while capping the fill at 100 %', () => {
    render(1.43, 'over', '143 % consommé, dépassé');

    expect(query('.percent').textContent.trim()).toBe(formatPercent(1.43, 'fr-FR'));
    expect(query('.fill').style.width).toBe('100%');
    expect(query('.fill').classList.contains('over')).toBe(true);
    expect(query('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('100');
  });

  it('should expose aria-label and aria-valuetext on the progressbar role with numeric bounds', () => {
    render(1.43, 'over', '143 % consommé, dépassé');

    const progressbar = query('[role="progressbar"]');
    expect(progressbar.getAttribute('aria-label')).toBe(ariaLabel);
    expect(progressbar.getAttribute('aria-valuetext')).toBe('143 % consommé, dépassé');
    expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('should not render any visible status text, only the exact percentage', () => {
    render(1.43, 'over', '143 % consommé, dépassé');

    expect(host().textContent.trim()).toBe(formatPercent(1.43, 'fr-FR'));
  });

  it('should follow the locale from SettingsService for the visible percentage', () => {
    render(0.62, 'under', '62 % consommé, dans le budget');

    settings.updateSettings({ locale: 'en-US' });
    fixture.detectChanges();

    expect(query('.percent').textContent.trim()).toBe(formatPercent(0.62, 'en-US'));
  });
});
