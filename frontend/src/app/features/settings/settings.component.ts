import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ConfirmationModalComponent } from '../../shared/ui/confirmation-modal/confirmation-modal.component';
import { SettingsService, NiviSettings } from '../../core/settings/settings.service';
import { DeviceCapabilitiesService, NIVI_MODULES } from '../../core/device/device-capabilities.service';

@Component({
  selector: 'app-settings',
  imports: [ConfirmationModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  readonly preferences = inject(SettingsService);
  readonly capabilities = inject(DeviceCapabilitiesService);
  readonly modules = NIVI_MODULES;
  readonly confirmingReset = signal(false);

  /** Resets a corrupt record only after confirmation in the dialog. */
  async confirmReset(): Promise<void> {
    await this.preferences.resetCorrupted(true);
    this.confirmingReset.set(false);
  }

  /** Persists a preference and restores the control to the saved value on failure. */
  async change(key: keyof NiviSettings, event: Event): Promise<void> {
    const control = event.target as HTMLInputElement;
    await this.preferences.set(key, control.checked);
    control.checked = this.preferences.settings()[key];
  }
}
