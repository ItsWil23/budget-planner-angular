import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, OnDestroy, Output, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';


@Component({
  selector: 'app-modal',
  imports: [TranslocoPipe],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly root = this.document.documentElement;
  private readonly window = this.document.defaultView;
  private readonly previousScrollY = this.window?.scrollY ?? 0;
  private readonly previousFocus = this.document.activeElement;
  private readonly previousBodyStyles = {
    overflow: this.document.body.style.overflow,
    position: this.document.body.style.position,
    top: this.document.body.style.top,
    left: this.document.body.style.left,
    right: this.document.body.style.right,
    width: this.document.body.style.width,
  };
  private readonly previousRootOverflow = this.root.style.overflow;

  readonly title = input<string | null>(null);
  protected readonly titleId = 'app-modal-title';

  @Output() closed = new EventEmitter<void>();

  constructor() {
    this.lockBackgroundScroll();
    queueMicrotask(() => this.focusInitial());
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closed.emit();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = this.focusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  ngOnDestroy(): void {
    this.restoreBackgroundScroll();
    if (this.previousFocus instanceof HTMLElement && this.previousFocus.isConnected) {
      this.previousFocus.focus();
    }
  }

  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }

  private focusInitial(): void {
    const body = this.host.nativeElement.querySelector('.modal-body');
    const firstContentControl = body?.querySelector<HTMLElement>(this.focusableSelector);
    const target = firstContentControl ?? this.host.nativeElement.querySelector<HTMLElement>('.close-btn');
    target?.focus();
  }

  private lockBackgroundScroll(): void {
    this.root.style.overflow = 'hidden';
    const body = this.document.body;
    body.style.position = 'fixed';
    body.style.top = `-${this.previousScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }

  private restoreBackgroundScroll(): void {
    this.root.style.overflow = this.previousRootOverflow;
    const body = this.document.body;
    body.style.overflow = this.previousBodyStyles.overflow;
    body.style.position = this.previousBodyStyles.position;
    body.style.top = this.previousBodyStyles.top;
    body.style.left = this.previousBodyStyles.left;
    body.style.right = this.previousBodyStyles.right;
    body.style.width = this.previousBodyStyles.width;
    if (this.previousScrollY > 0) {
      this.window?.scrollTo(0, this.previousScrollY);
    }
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(this.focusableSelector)).filter(
      element => !element.hasAttribute('disabled') && element.tabIndex >= 0,
    );
  }

  private readonly focusableSelector =
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
}
