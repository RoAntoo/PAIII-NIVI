import { afterNextRender, Component, ChangeDetectionStrategy, ElementRef, HostListener, inject, input, OnDestroy, output, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';

let nextModalId = 0;

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.css',
})
export class ConfirmationModalComponent implements OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private document = inject(DOCUMENT);
  private opener = this.document.activeElement as HTMLElement | null;
  private previousOverflow = this.document.body.style.overflow;
  private content?: HTMLElement & { scrollX: boolean; scrollY: boolean };
  private previousScroll?: { x: boolean; y: boolean };
  private card = viewChild.required<ElementRef<HTMLElement>>('card');
  readonly titleId = `confirmation-title-${nextModalId++}`;
  readonly messageId = `${this.titleId}-message`;

  /** Locks background scrolling and focuses the least destructive action after rendering. */
  constructor() {
    this.document.body.style.overflow = 'hidden';
    afterNextRender(() => {
      this.content = this.host.nativeElement.closest('ion-content') as typeof this.content;
      if (this.content) {
        this.previousScroll = { x: this.content.scrollX, y: this.content.scrollY };
        this.content.scrollX = false;
        this.content.scrollY = false;
      }
      this.card().nativeElement.querySelector<HTMLButtonElement>('button')?.focus();
    });
  }
  title = input<string>('Confirmación');
  message = input<string>('¿Estás seguro de realizar esta acción?');
  warningText = input<string | null>(null);
  confirmText = input<string>('Confirmar');
  cancelText = input<string>('Cancelar');
  isLoading = input<boolean>(false);
  confirmLoadingText = input<string>('Procesando...');
  restoreOpener = input(true);

  confirm = output<void>();
  cancel = output<void>();

  /** Emits confirmation once processing is allowed. */
  onConfirm(): void {
    if (!this.isLoading()) this.confirm.emit();
  }

  /** Emits cancellation unless a destructive request is in progress. */
  onCancel(): void {
    if (!this.isLoading()) this.cancel.emit();
  }

  @HostListener('document:keydown', ['$event'])
  /** Confines keyboard focus to the dialog and handles Escape. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
    if (event.key !== 'Tab') return;
    const card = this.card().nativeElement;
    const buttons = Array.from(card.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    if (!buttons.length) { event.preventDefault(); card.focus(); return; }
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const active = this.document.activeElement;
    if (!buttons.includes(active as HTMLButtonElement) || (event.shiftKey && active === first)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault(); first.focus();
    }
  }

  /** Restores previous scroll settings and the opener when requested and still attached. */
  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousOverflow;
    if (this.content && this.previousScroll) {
      this.content.scrollX = this.previousScroll.x;
      this.content.scrollY = this.previousScroll.y;
    }
    if (this.restoreOpener() && this.opener?.isConnected) this.opener.focus();
  }
}
