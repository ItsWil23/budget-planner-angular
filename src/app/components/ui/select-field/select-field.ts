import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectFieldOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const TYPEAHEAD_RESET_MS = 500;
const FLIP_THRESHOLD_PX = 280;

@Component({
  selector: 'app-select-field',
  templateUrl: './select-field.html',
  styleUrl: './select-field.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectField), multi: true }],
})
export class SelectField implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly inputId = input.required<string>();
  readonly options = input<readonly SelectFieldOption[]>([]);
  readonly placeholder = input('');
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);

  protected readonly open = signal(false);
  protected readonly placeAbove = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly selectedValue = signal('');
  protected readonly disabled = signal(false);
  protected readonly panelId = computed(() => `${this.inputId()}-listbox`);
  protected readonly selectedIndex = computed(() =>
    this.options().findIndex(option => option.value === this.selectedValue()),
  );
  protected readonly selectedLabel = computed(() => this.options()[this.selectedIndex()]?.label ?? '');

  private typeahead = '';
  private lastKeyAt = 0;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  @HostListener('keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    if (!this.open()) return;
    event.preventDefault();
    event.stopPropagation();
    this.close(true);
  }

  @HostListener('document:pointerdown', ['$event.target'])
  protected onDocumentPointerDown(target: EventTarget | null): void {
    if (target instanceof Node && !this.host.nativeElement.contains(target)) this.close(false);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || this.host.nativeElement.contains(next)) return;
    this.close(false);
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (!this.open()) this.openPanel();
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        return;
      case 'Home':
        event.preventDefault();
        this.focusOption(this.firstEnabled());
        return;
      case 'End':
        event.preventDefault();
        this.focusOption(this.lastEnabled());
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.choose(this.activeIndex());
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          this.typeAhead(event.key);
        }
    }
  }

  protected toggle(): void {
    if (this.open()) {
      this.close(true);
      return;
    }
    this.openPanel();
  }

  protected choose(index: number): void {
    const option = this.options()[index];
    if (!option || option.disabled) return;
    this.selectedValue.set(option.value);
    this.onChange(option.value);
    this.close(true);
  }

  writeValue(value: string | null): void {
    this.selectedValue.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) this.close(false);
  }

  private openPanel(): void {
    const selected = this.selectedIndex();
    this.activeIndex.set(selected >= 0 ? selected : this.firstEnabled());
    this.open.set(true);
    afterNextRender(
      () => {
        this.placeAbove.set(this.shouldPlaceAbove());
        this.focusOption(this.activeIndex());
      },
      { injector: this.injector },
    );
  }

  private close(restoreFocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
    if (restoreFocus) this.trigger().nativeElement.focus();
  }

  private moveActive(step: 1 | -1): void {
    const count = this.options().length;
    if (count === 0) return;
    const start = this.activeIndex();
    for (let offset = 1; offset <= count; offset++) {
      const candidate = (((start + step * offset) % count) + count) % count;
      if (!this.options()[candidate].disabled) {
        this.focusOption(candidate);
        return;
      }
    }
  }

  private typeAhead(key: string): void {
    const now = Date.now();
    this.typeahead = now - this.lastKeyAt > TYPEAHEAD_RESET_MS ? key : this.typeahead + key;
    this.lastKeyAt = now;

    const needle = this.typeahead.toLowerCase();
    const count = this.options().length;
    // Une seule lettre répétée fait défiler les options qui commencent par elle.
    const start = this.typeahead.length > 1 ? this.activeIndex() : this.activeIndex() + 1;
    for (let offset = 0; offset < count; offset++) {
      const index = (((start + offset) % count) + count) % count;
      const option = this.options()[index];
      if (!option.disabled && option.label.toLowerCase().startsWith(needle)) {
        this.focusOption(index);
        return;
      }
    }
  }

  private focusOption(index: number): void {
    if (index < 0) return;
    this.activeIndex.set(index);
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role="option"]')[index]?.focus();
  }

  private firstEnabled(): number {
    return this.options().findIndex(option => !option.disabled);
  }

  private lastEnabled(): number {
    const options = this.options();
    for (let index = options.length - 1; index >= 0; index--) {
      if (!options[index].disabled) return index;
    }
    return -1;
  }

  private shouldPlaceAbove(): boolean {
    const rect = this.trigger().nativeElement.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    return spaceBelow < FLIP_THRESHOLD_PX && rect.top > spaceBelow;
  }
}
