import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { vi } from 'vitest';

import { Modal } from './modal';

@Component({
  selector: 'test-modal-host',
  imports: [Modal],
  template: `
    @if (open) {
      <app-modal [title]="title" (closed)="close()">
        <button id="first-action" type="button">First action</button>
        <button id="last-action" type="button">Last action</button>
      </app-modal>
    }
  `,
})
class ModalHost {
  readonly title = 'Recurring rules';
  open = true;
  closeCount = 0;

  close(): void {
    this.closeCount++;
    this.open = false;
  }
}

describe('Modal', () => {
  let component: ModalHost;
  let fixture: ComponentFixture<ModalHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ModalHost,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              modal: { close: 'Fermer' },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();
  });

  async function createFixture(): Promise<void> {
    fixture = TestBed.createComponent(ModalHost);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create', async () => {
    await createFixture();
    expect(component).toBeTruthy();
  });

  it('should expose a named modal dialog', async () => {
    await createFixture();
    const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('app-modal-title');
    expect(fixture.nativeElement.querySelector('#app-modal-title')?.textContent?.trim()).toBe('Recurring rules');
  });

  it('should give the close button an accessible French name and button type', async () => {
    await createFixture();
    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.close-btn');
    expect(closeButton.getAttribute('title')).toBe('Fermer');
    expect(closeButton.getAttribute('aria-label')).toBe('Fermer');
    expect(closeButton.type).toBe('button');
  });

  it('should close on Escape', async () => {
    await createFixture();
    const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(component.closeCount).toBe(1);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should keep Tab navigation inside the dialog', async () => {
    await createFixture();
    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.close-btn');
    const lastAction: HTMLButtonElement = fixture.nativeElement.querySelector('#last-action');

    lastAction.focus();
    lastAction.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(closeButton);

    closeButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(lastAction);
  });

  it('should restore focus to the opener when the dialog is destroyed', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();

    await createFixture();
    fixture.destroy();

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('should lock background scroll and restore body styles and scroll position', async () => {
    const body = document.body;
    const root = document.documentElement;
    const previousStyles = {
      rootOverflow: root.style.overflow,
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    root.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.position = 'relative';
    body.style.top = '12px';
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    try {
      await createFixture();
      expect(root.style.overflow).toBe('hidden');
      expect(body.style.position).toBe('fixed');
      expect(body.style.top).toBe('-120px');
      expect(body.style.overflow).toBe('hidden');

      fixture.destroy();

      expect(root.style.overflow).toBe('auto');
      expect(body.style.overflow).toBe('auto');
      expect(body.style.position).toBe('relative');
      expect(body.style.top).toBe('12px');
      expect(scrollTo).toHaveBeenCalledWith(0, 120);
    } finally {
      root.style.overflow = previousStyles.rootOverflow;
      body.style.overflow = previousStyles.overflow;
      body.style.position = previousStyles.position;
      body.style.top = previousStyles.top;
      body.style.left = previousStyles.left;
      body.style.right = previousStyles.right;
      body.style.width = previousStyles.width;
    }
  });

  it('should close on an overlay click but not on a panel click', async () => {
    await createFixture();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.panel');
    const overlay: HTMLElement = fixture.nativeElement.querySelector('.overlay');

    panel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(component.closeCount).toBe(0);

    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(component.closeCount).toBe(1);
  });
});
