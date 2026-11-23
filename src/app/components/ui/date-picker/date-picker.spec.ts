import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsService } from '../../../services/settings';
import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  let fixture: ComponentFixture<DatePicker>;
  let onChange = vi.fn<(value: string) => void>();

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('#test-date') as HTMLButtonElement;
  }

  function panel(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.picker-panel');
  }

  function activeCell(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.picker-panel [tabindex="0"]') as HTMLButtonElement;
  }

  function title(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.picker-title') as HTMLButtonElement;
  }

  function choiceCells(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.picker-cell--choice'));
  }

  function buttonByText(selector: string, text: string): HTMLButtonElement | undefined {
    const root: HTMLElement = fixture.nativeElement;
    return Array.from(root.querySelectorAll<HTMLButtonElement>(selector)).find(
      cell => cell.textContent.trim() === text,
    );
  }

  function dispatchKey(target: HTMLElement, key: string): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  function openPicker(): void {
    trigger().click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DatePicker,
        TranslocoTestingModule.forRoot({
          langs: { fr: {} },
          translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    TestBed.inject(SettingsService).updateSettings({ locale: 'fr-FR' });
    fixture = TestBed.createComponent(DatePicker);
    fixture.componentRef.setInput('inputId', 'test-date');
    fixture.detectChanges();
    onChange = vi.fn<(value: string) => void>();
    fixture.componentInstance.registerOnChange(onChange);
  });

  it('keeps the civil date from the model without a UTC shift', () => {
    fixture.componentInstance.writeValue('2026-03-01');
    fixture.detectChanges();

    openPicker();

    expect(activeCell().textContent?.trim()).toBe('1');
    expect(trigger().textContent).toContain('2026');
  });

  it('emits the ISO string of the chosen day and closes', () => {
    fixture.componentInstance.writeValue('2026-03-10');
    openPicker();

    buttonByText('.picker-cell:not(.is-outside)', '20')?.click();
    fixture.detectChanges();

    expect(onChange).toHaveBeenCalledWith('2026-03-20');
    expect(panel()).toBeNull();
  });

  it('starts the week on Sunday for en-US', () => {
    TestBed.inject(SettingsService).updateSettings({ locale: 'en-US' });
    const labels = fixture.componentInstance['weekdayLabels']();

    expect(labels[0]).toMatch(/^Sun/);
  });

  it('falls back to the region for en-US when neither getWeekInfo nor weekInfo exists', () => {
    const proto = Intl.Locale.prototype as unknown as Record<string, unknown>;
    const getWeekInfo = Object.getOwnPropertyDescriptor(proto, 'getWeekInfo');
    const weekInfo = Object.getOwnPropertyDescriptor(proto, 'weekInfo');
    delete proto['getWeekInfo'];
    delete proto['weekInfo'];
    try {
      TestBed.inject(SettingsService).updateSettings({ locale: 'en-US' });
      const labels = fixture.componentInstance['weekdayLabels']();

      expect(labels[0]).toMatch(/^Sun/);
    } finally {
      if (getWeekInfo) Object.defineProperty(proto, 'getWeekInfo', getWeekInfo);
      if (weekInfo) Object.defineProperty(proto, 'weekInfo', weekInfo);
    }
  });

  it('exposes the calendar as a named group without a nested dialog', () => {
    openPicker();

    expect(panel()?.getAttribute('role')).toBe('group');
    expect(panel()?.getAttribute('aria-label')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(trigger().getAttribute('aria-haspopup')).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('closes on an outside pointerdown without changing the value', () => {
    fixture.componentInstance.writeValue('2026-03-10');
    openPicker();

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('returns focus to the trigger after Escape', () => {
    fixture.componentInstance.writeValue('2026-03-10');
    openPicker();

    dispatchKey(activeCell(), 'Escape');

    expect(document.activeElement).toBe(trigger());
  });

  it('returns focus to the trigger after choosing a day', () => {
    fixture.componentInstance.writeValue('2026-03-10');
    openPicker();

    buttonByText('.picker-cell:not(.is-outside)', '20')?.click();
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger());
  });

  it('moves the active day with arrow keys without emitting a value', () => {
    fixture.componentInstance.writeValue('2026-03-10');
    openPicker();

    dispatchKey(activeCell(), 'ArrowRight');

    expect(activeCell().textContent?.trim()).toBe('11');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes on Escape and keeps the previous value', () => {
    fixture.componentInstance.writeValue('2026-03-10');
    openPicker();

    dispatchKey(activeCell(), 'Escape');

    expect(panel()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(fixture.componentInstance['selected']()).toBe('2026-03-10');
  });

  it('descends from year to month to day before choosing', () => {
    fixture.componentInstance.writeValue('2026-01-05');
    openPicker();

    title().click();
    fixture.detectChanges();
    title().click();
    fixture.detectChanges();
    buttonByText('.picker-cell--choice', '2026')?.click();
    fixture.detectChanges();
    choiceCells()[2].click();
    fixture.detectChanges();
    buttonByText('.picker-cell:not(.is-outside)', '1')?.click();
    fixture.detectChanges();

    expect(onChange).toHaveBeenCalledWith('2026-03-01');
  });

  it('stays open when choosing a year replaces the focused cell', () => {
    fixture.componentInstance.writeValue('2026-01-05');
    openPicker();
    title().click();
    fixture.detectChanges();
    title().click();
    fixture.detectChanges();

    const yearCell = buttonByText('.picker-cell--choice', '2026') as HTMLButtonElement;
    yearCell.click();
    // Chrome émet ce focusout quand @switch retire la cellule focalisée pendant le rendu.
    yearCell.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    fixture.detectChanges();

    expect(panel()).not.toBeNull();
    expect(title().textContent.trim()).toBe('2026');
    expect(choiceCells()).toHaveLength(12);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes when focus really leaves the picker', () => {
    fixture.componentInstance.writeValue('2026-03-10');
    openPicker();
    const outside = document.createElement('button');
    document.body.append(outside);

    activeCell().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    fixture.detectChanges();
    outside.remove();

    expect(panel()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('starts the week on Monday for fr-FR', () => {
    const labels = fixture.componentInstance['weekdayLabels']();

    expect(labels[0]).toMatch(/^lun/);
  });

  describe('placement inside the clipping container', () => {
    const PANEL_WIDTH = 300;

    function mockPanelSize(height: number, scrollbar = 0): void {
      const isPanel = (element: HTMLElement): boolean => element.classList.contains('picker-panel');
      const isHeader = (element: HTMLElement): boolean => element.classList.contains('picker-header');
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        if (isPanel(this)) return rectOf(0, 0, PANEL_WIDTH, height);
        if (isHeader(this)) return rectOf(0, 0, PANEL_WIDTH - scrollbar, 0);
        return rectOf(0, 0, 0, 0);
      });
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
        return isPanel(this) ? height : 0;
      });
      vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
        return isPanel(this) ? height : 0;
      });
      vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
        return isPanel(this) ? height : 0;
      });
    }

    function rectOf(left: number, top: number, right: number, bottom: number): DOMRect {
      return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
        x: left,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    }

    function mockRect(element: Element, left: number, top: number, right: number, bottom: number): void {
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rectOf(left, top, right, bottom));
    }

    function mockContainer(width: number, height: number): HTMLElement {
      const container = fixture.nativeElement.parentElement as HTMLElement;
      container.style.overflow = 'hidden';
      Object.defineProperty(container, 'clientWidth', { configurable: true, value: width });
      Object.defineProperty(container, 'clientHeight', { configurable: true, value: height });
      mockRect(container, 0, 0, width, height);
      return container;
    }

    function panelStyle(name: string): string {
      return panel()?.style.getPropertyValue(name) ?? '';
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('shifts the panel so it stays inside the modal horizontally', () => {
      mockContainer(400, 800);
      mockRect(trigger(), 340, 300, 380, 344);
      mockPanelSize(300);

      openPicker();

      // Centre désiré 210 px, bord max 92 px (400 - 8 - 300) : décalage de -118 px.
      expect(panelStyle('--picker-shift')).toBe('-118px');
      expect(panel()?.classList.contains('is-above')).toBe(false);
    });

    it('keeps the panel centred on the field when it fits horizontally', () => {
      mockContainer(800, 800);
      mockRect(trigger(), 340, 300, 380, 344);
      mockPanelSize(300);

      openPicker();

      expect(panelStyle('--picker-shift')).toBe('0px');
    });

    it('opens above when there is not enough room below but enough above', () => {
      mockContainer(800, 800);
      mockRect(trigger(), 340, 700, 380, 744);
      mockPanelSize(400);

      openPicker();

      expect(panel()?.classList.contains('is-above')).toBe(true);
      expect(panel()?.style.maxBlockSize).toBe('');
    });

    it('caps the height and scrolls when the calendar fits neither above nor below', () => {
      mockContainer(800, 800);
      mockRect(trigger(), 340, 700, 380, 744);
      mockPanelSize(900);

      openPicker();

      // Espace au-dessus : 700 - 8 = 692 px.
      expect(panel()?.classList.contains('is-above')).toBe(true);
      expect(panel()?.style.maxBlockSize).toBe('692px');
      expect(panel()?.style.overflowY).toBe('auto');
    });

    it('reserves the fractional scrollbar width so the day cells keep 44 px', () => {
      mockContainer(800, 800);
      mockRect(trigger(), 340, 700, 380, 744);
      mockPanelSize(900, 15.4);

      openPicker();

      expect(parseFloat(panelStyle('--picker-scrollbar'))).toBeCloseTo(15.4, 5);
    });
  });

  it('clamps the day to a leap February without shifting the civil date', () => {
    fixture.componentInstance.writeValue('2028-01-31');
    openPicker();

    (fixture.nativeElement.querySelectorAll('.picker-nav')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    buttonByText('.picker-cell:not(.is-outside)', '29')?.click();
    fixture.detectChanges();

    expect(onChange).toHaveBeenCalledWith('2028-02-29');
  });

  describe('week rows', () => {
    function dayCellCount(): number {
      return fixture.nativeElement.querySelectorAll('.picker-grid--days .picker-cell').length;
    }

    it('uses four rows when the month fits exactly in four weeks', () => {
      // Février 2021 commence un lundi et compte 28 jours.
      fixture.componentInstance.writeValue('2021-02-10');
      openPicker();

      expect(dayCellCount()).toBe(28);
    });

    it('uses five rows when the month needs five weeks', () => {
      // Octobre 2026 commence un jeudi et compte 31 jours.
      fixture.componentInstance.writeValue('2026-10-05');
      openPicker();

      expect(dayCellCount()).toBe(35);
    });

    it('uses six rows when the month needs six weeks, with seven columns', () => {
      // Novembre 2026 commence un dimanche : 6 jours de la semaine précédente + 30 jours.
      fixture.componentInstance.writeValue('2026-11-05');
      openPicker();

      expect(dayCellCount()).toBe(42);
    });

    it('keeps the civil date while navigating between months with different row counts', () => {
      fixture.componentInstance.writeValue('2026-10-05');
      openPicker();

      (fixture.nativeElement.querySelectorAll('.picker-nav')[1] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(dayCellCount()).toBe(42);
      (fixture.nativeElement.querySelectorAll('.picker-nav')[0] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(dayCellCount()).toBe(35);
      expect(onChange).not.toHaveBeenCalled();

      buttonByText('.picker-cell:not(.is-outside)', '5')?.click();
      fixture.detectChanges();

      expect(onChange).toHaveBeenCalledWith('2026-10-05');
    });
  });
});
