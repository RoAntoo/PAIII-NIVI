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
  private document = inject(DOCUMENT);
  private opener = this.document.activeElement as HTMLElement | null;
  private previousOverflow = this.document.body.style.overflow;
  private card = viewChild.required<ElementRef<HTMLElement>>('card');
  readonly titleId = `confirmation-title-${nextModalId++}`;
  readonly messageId = `${this.titleId}-message`;

  constructor() {
    this.document.body.style.overflow = 'hidden';
    afterNextRender(() => this.card().nativeElement.querySelector<HTMLButtonElement>('button')?.focus());
  }
  title = input<string>('Confirmación');
  message = input<string>('¿Estás seguro de realizar esta acción?');
  warningText = input<string | null>(null);
  confirmText = input<string>('Confirmar');
  cancelText = input<string>('Cancelar');
  isLoading = input<boolean>(false);
  confirmLoadingText = input<string>('Procesando...');

  confirm = output<void>();
  cancel = output<void>();

  onConfirm(): void {
    if (!this.isLoading()) this.confirm.emit();
  }

  onCancel(): void {
    if (!this.isLoading()) this.cancel.emit();
  }

  @HostListener('document:keydown', ['$event'])
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

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousOverflow;
    if (this.opener?.isConnected) this.opener.focus();
  }
}
