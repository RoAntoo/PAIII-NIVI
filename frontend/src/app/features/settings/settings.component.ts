import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SettingsService, NiviSettings } from '../../core/settings/settings.service';
import { DeviceCapabilitiesService, NIVI_MODULES } from '../../core/device/device-capabilities.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  readonly preferences = inject(SettingsService);
  readonly capabilities = inject(DeviceCapabilitiesService);
  readonly modules = NIVI_MODULES;

  /** Persists a preference and restores the control to the saved value on failure. */
  async change(key: keyof NiviSettings, event: Event): Promise<void> {
    const control = event.target as HTMLInputElement;
    await this.preferences.set(key, control.checked);
    control.checked = this.preferences.settings()[key];
  }
}
