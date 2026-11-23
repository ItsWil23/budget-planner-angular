import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectField, SelectFieldOption } from './select-field';

const OPTIONS: readonly SelectFieldOption[] = [
  { value: 'food', label: 'Alimentation' },
  { value: 'leisure', label: 'Loisirs', disabled: true },
  { value: 'housing', label: 'Logement' },
  { value: 'health', label: 'Santé' },
];

describe('SelectField', () => {
  let fixture: ComponentFixture<SelectField>;

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('#test-select') as HTMLButtonElement;
  }

  function options(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
  }

  function keydown(target: HTMLElement, key: string): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  async function open(): Promise<void> {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SelectField,
        TranslocoTestingModule.forRoot({
          langs: { fr: {} },
          translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectField);
    fixture.componentRef.setInput('inputId', 'test-select');
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('placeholder', 'Choisir');
    fixture.detectChanges();
  });

  it('opens with ArrowDown and focuses the selected option', async () => {
    fixture.componentInstance.writeValue('housing');
    fixture.detectChanges();

    keydown(trigger(), 'ArrowDown');
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(options()[2].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(options()[2]);
  });

  it('skips disabled options with arrow keys and never selects them', async () => {
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);
    await open();

    keydown(options()[0], 'ArrowDown');
    expect(document.activeElement).toBe(options()[2]);

    options()[1].click();
    fixture.detectChanges();
    expect(onChange).not.toHaveBeenCalled();
    expect(options()[1].getAttribute('aria-disabled')).toBe('true');
  });

  it('chooses the active option with Enter, emits it, and returns focus to the trigger', async () => {
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);
    await open();

    keydown(options()[0], 'End');
    keydown(document.activeElement as HTMLElement, 'Enter');

    expect(onChange).toHaveBeenCalledWith('health');
    expect(trigger().textContent).toContain('Santé');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger());
  });

  it('closes on Escape without emitting a value and restores focus', async () => {
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);
    await open();

    keydown(options()[0], 'Escape');

    expect(onChange).not.toHaveBeenCalled();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger());
  });

  it('moves focus to the enabled option matching the typed letters, resetting after a pause', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
    await open();

    keydown(options()[0], 's');
    expect(document.activeElement).toBe(options()[3]);

    vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 1));
    keydown(options()[3], 'l');
    expect(document.activeElement).toBe(options()[2]);
    vi.useRealTimers();
  });

  it('marks the trigger invalid and links it to its hint', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.componentRef.setInput('describedBy', 'hint-id');
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-invalid')).toBe('true');
    expect(trigger().getAttribute('aria-describedby')).toBe('hint-id');
  });

  it('removes the invalid marking once the field is valid again', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    fixture.componentRef.setInput('invalid', false);
    fixture.detectChanges();

    expect(trigger().hasAttribute('aria-invalid')).toBe(false);
  });

  it('closes when the pointer goes outside the component', async () => {
    await open();

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });
});
