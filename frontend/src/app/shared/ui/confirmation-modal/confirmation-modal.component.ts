import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.css',
})
export class ConfirmationModalComponent {
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
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
