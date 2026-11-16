import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MonthPicker } from './month-picker';

const TRANSLATIONS = {
  fr: {
    monthPicker: {
      dialog: 'Choisir un mois',
      close: 'Fermer le sélecteur',
      clear: 'Effacer',
      previousYear: 'Année précédente',
      nextYear: 'Année suivante',
      previousYears: 'Années précédentes',
      nextYears: 'Années suivantes',
      showYears: 'Choisir une année, actuellement {{year}}',
      showMonths: 'Revenir aux mois',
    },
  },
};

describe('MonthPicker', () => {
  let fixture: ComponentFixture<MonthPicker>;

  function element<T extends HTMLElement>(selector: string): T {
    const found = fixture.nativeElement.querySelector(selector) as T | null;
    if (!found) throw new Error(`Missing element: ${selector}`);
    return found;
  }

  function click(selector: string): void {
    element<HTMLElement>(selector).click();
    fixture.detectChanges();
  }

  function pickMonth(monthKey: string): void {
    click('#end-month');
    click('.picker-title');
    click(`[data-key="${monthKey.slice(0, 4)}"]`);
    click(`[data-key="${monthKey}"]`);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MonthPicker,
        TranslocoTestingModule.forRoot({
          langs: TRANSLATIONS,
          translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 16));
    fixture = TestBed.createComponent(MonthPicker);
    fixture.componentRef.setInput('fieldId', 'end-month');
    fixture.componentRef.setInput('minMonth', '2026-12');
    fixture.componentRef.setInput('defaultMonth', '2026-12');
    fixture.componentRef.setInput('locale', 'fr-FR');
    fixture.componentRef.setInput('placeholder', 'Aucune fin');
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the default month year and reports the placeholder when empty', () => {
    expect(element<HTMLElement>('#end-month').textContent?.trim()).toBe('Aucune fin');
    click('#end-month');

    expect(element<HTMLElement>('#end-month').getAttribute('aria-expanded')).toBe('true');
    expect(element<HTMLElement>('.picker-title').textContent?.trim()).toBe('2026');
    expect(fixture.nativeElement.querySelectorAll('.picker-cell')).toHaveLength(12);
  });

  it('emits the selected month after choosing a year and a month', () => {
    const valueChange = vi.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    pickMonth('2027-02');

    expect(valueChange).toHaveBeenCalledWith('2027-02');
    expect(fixture.nativeElement.querySelector('.picker-panel')).toBeNull();
  });

  it('disables months before the minimum month', () => {
    click('#end-month');

    expect(element<HTMLElement>('[data-key="2026-11"]').getAttribute('aria-disabled')).toBe('true');
    expect(element<HTMLElement>('[data-key="2026-12"]').getAttribute('aria-disabled')).toBeNull();
  });

  it('keeps the panel open and emits nothing when a disabled month is clicked', () => {
    click('#end-month');
    const valueChange = vi.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    click('[data-key="2026-11"]');

    expect(valueChange).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.picker-panel')).not.toBeNull();
  });

  it('shows a year grid from the title and returns to months after choosing a year', () => {
    click('#end-month');
    click('.picker-title');

    expect(fixture.nativeElement.querySelector('.picker-grid-years')).not.toBeNull();
    click('[data-key="2027"]');

    expect(fixture.nativeElement.querySelector('.picker-grid-years')).toBeNull();
    expect(element<HTMLElement>('.picker-title').textContent?.trim()).toBe('2027');
  });

  it('clears a selected month and emits an empty value', () => {
    fixture.componentRef.setInput('value', '2027-02');
    fixture.detectChanges();
    const valueChange = vi.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    click('.picker-clear');

    expect(valueChange).toHaveBeenCalledWith('');
  });

  it('stays open when the focused cell is removed by a view change', () => {
    click('#end-month');
    const cell = element<HTMLElement>('[data-key="2026-12"]');
    cell.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.picker-panel')).not.toBeNull();
  });

  it('closes when focus moves outside the picker', () => {
    click('#end-month');
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    element<HTMLElement>('[data-key="2026-12"]').dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
    );
    fixture.detectChanges();
    outside.remove();

    expect(fixture.nativeElement.querySelector('.picker-panel')).toBeNull();
  });

  it('closes with the close button without emitting a value', () => {
    click('#end-month');
    const valueChange = vi.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    click('[aria-label="Fermer le sélecteur"]');

    expect(valueChange).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.picker-panel')).toBeNull();
  });

  it('closes on Escape without propagating the key to a parent dialog', () => {
    click('#end-month');
    const parentListener = vi.fn();
    document.addEventListener('keydown', parentListener);
    element<HTMLElement>('#end-month').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.removeEventListener('keydown', parentListener);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.picker-panel')).toBeNull();
    expect(parentListener).not.toHaveBeenCalled();
  });
});
