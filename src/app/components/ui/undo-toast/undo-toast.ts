import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  input,
  output,
  viewChild,
  inject,
} from '@angular/core';

export const UNDO_TOAST_DURATION_MS = 10_000;

@Component({
  selector: 'app-undo-toast',
  imports: [],
  templateUrl: './undo-toast.html',
  styleUrl: './undo-toast.scss',
})
export class UndoToast implements OnInit, OnDestroy {
  readonly message = input.required<string>();
  readonly actionLabel = input<string | null>(null);
  readonly durationMs = input<number>(UNDO_TOAST_DURATION_MS);

  readonly action = output<void>();
  readonly expired = output<void>();

  private readonly actionButton = viewChild<ElementRef<HTMLButtonElement>>('actionButton');
  private readonly injector = inject(Injector);
  private timerId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.timerId = setTimeout(() => {
      this.timerId = null;
      this.expired.emit();
    }, this.durationMs());

    if (this.actionLabel() !== null) {
      afterNextRender(() => this.actionButton()?.nativeElement.focus(), { injector: this.injector });
    }
  }

  ngOnDestroy(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
    }
  }
}
