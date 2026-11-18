import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, DestroyRef, ElementRef, Injector, inject, input, signal, viewChild } from '@angular/core';

const CLIPPING_OVERFLOW = new Set(['auto', 'scroll', 'hidden', 'clip']);

@Component({
  selector: 'app-row-menu',
  templateUrl: './row-menu.html',
  styleUrl: './row-menu.scss',
})
export class RowMenu {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly label = input.required<string>();
  readonly menuKey = input.required<string>();
  readonly triggerAction = input.required<string>();

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');
  protected readonly opened = signal(false);
  protected readonly placement = signal<'below' | 'above'>('below');

  constructor() {
    // Phase de capture : un clic extérieur ferme le menu même si un ancêtre (ex. modal) arrête sa propagation.
    const onPress = (event: Event): void => this.closeIfOutside(event.target);
    this.document.addEventListener('pointerdown', onPress);
    this.document.addEventListener('click', onPress, true);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('pointerdown', onPress);
      this.document.removeEventListener('click', onPress, true);
    });
  }

  protected toggle(event: MouseEvent): void {
    if (this.opened()) {
      this.opened.set(false);
      return;
    }
    const fromKeyboard = event.detail === 0;
    this.opened.set(true);
    this.placement.set('below');
    afterNextRender(
      () => {
        this.place();
        // Un clic produit au clavier (detail 0) place le focus sur le premier item.
        if (fromKeyboard) this.items()[0]?.focus();
      },
      { injector: this.injector },
    );
  }

  protected onMenuClick(event: Event): void {
    if (event.target instanceof Element && event.target.closest('[role="menuitem"]')) this.opened.set(false);
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.opened.set(false);
      this.trigger().nativeElement.focus();
      return;
    }
    if (event.key === 'Tab') {
      this.opened.set(false);
      return;
    }

    const items = this.items();
    const index = items.indexOf(event.target as HTMLButtonElement);
    const last = items.length - 1;
    let target: HTMLButtonElement | undefined;
    if (event.key === 'ArrowDown') target = items[index >= last ? 0 : index + 1];
    else if (event.key === 'ArrowUp') target = items[index <= 0 ? last : index - 1];
    else if (event.key === 'Home') target = items[0];
    else if (event.key === 'End') target = items[last];
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  private closeIfOutside(target: EventTarget | null): void {
    if (!this.opened()) return;
    if (target instanceof Node && this.host.nativeElement.contains(target)) return;
    this.opened.set(false);
  }

  private place(): void {
    const menu = this.menu()?.nativeElement;
    if (!menu) return;

    const triggerRect = this.trigger().nativeElement.getBoundingClientRect();
    const bounds = this.visibleBounds(this.trigger().nativeElement);
    const spaceBelow = bounds.bottom - triggerRect.bottom;
    const spaceAbove = triggerRect.top - bounds.top;
    if (spaceBelow < menu.offsetHeight && spaceAbove > spaceBelow) {
      this.placement.set('above');
    }
  }

  // Bornes verticales visibles : le conteneur défilant le plus proche, sinon la fenêtre.
  private visibleBounds(element: HTMLElement): { top: number; bottom: number } {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (!CLIPPING_OVERFLOW.has(getComputedStyle(parent).overflowY)) continue;
      const rect = parent.getBoundingClientRect();
      return { top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) };
    }
    return { top: 0, bottom: window.innerHeight };
  }

  private items(): HTMLButtonElement[] {
    return Array.from(this.menu()?.nativeElement.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
  }
}
