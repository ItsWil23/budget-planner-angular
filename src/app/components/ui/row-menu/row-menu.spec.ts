import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RowMenu } from './row-menu';

@Component({
  selector: 'test-row-menu-host',
  imports: [RowMenu],
  template: `
    <button id="outside" type="button">Outside</button>
    <app-row-menu label="Actions" menuKey="series-1" triggerAction="row-actions-series-1">
      <button type="button" role="menuitem" data-action="edit-series-1">Edit</button>
      <button type="button" role="menuitem" data-action="toggle-series-1">Toggle</button>
    </app-row-menu>
  `,
})
class RowMenuHost {}

describe('RowMenu', () => {
  let fixture: ComponentFixture<RowMenuHost>;
  let trigger: HTMLButtonElement;

  const menu = (): HTMLElement | null => fixture.nativeElement.querySelector('.row-menu-panel');
  const items = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('[role="menuitem"]'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RowMenuHost] }).compileComponents();
    fixture = TestBed.createComponent(RowMenuHost);
    fixture.detectChanges();
    trigger = fixture.nativeElement.querySelector('[data-menu-trigger="series-1"]');
  });

  it('exposes the trigger attributes and keeps the menu closed initially', () => {
    expect(trigger.getAttribute('data-action')).toBe('row-actions-series-1');
    expect(trigger.getAttribute('aria-label')).toBe('Actions');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(menu()).toBeNull();
  });

  it('closes on an outside click', () => {
    trigger.click();
    fixture.detectChanges();
    expect(menu()).not.toBeNull();

    fixture.nativeElement.querySelector('#outside').click();
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });

  it('closes when a projected item is clicked', () => {
    trigger.click();
    fixture.detectChanges();

    items()[0].click();
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });

  it('returns focus to the trigger on Escape', () => {
    trigger.click();
    fixture.detectChanges();

    menu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('moves focus between items with arrow, Home and End keys', () => {
    trigger.click();
    fixture.detectChanges();
    items()[0].focus();

    const press = (key: string, target: HTMLElement): void => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    };

    press('ArrowDown', items()[0]);
    expect(document.activeElement).toBe(items()[1]);

    press('ArrowDown', items()[1]);
    expect(document.activeElement).toBe(items()[0]);

    press('End', items()[0]);
    expect(document.activeElement).toBe(items()[1]);

    press('Home', items()[1]);
    expect(document.activeElement).toBe(items()[0]);
  });

  it('focuses the first item when opened from the keyboard, then closes on Tab', () => {
    trigger.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
    fixture.detectChanges();
    TestBed.tick();

    expect(document.activeElement).toBe(items()[0]);

    menu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });
});
