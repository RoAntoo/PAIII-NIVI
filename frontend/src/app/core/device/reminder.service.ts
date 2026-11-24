import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { ActionPerformed, LocalNotifications, LocalNotificationsPlugin } from '@capacitor/local-notifications';
import { environment } from '../../../environments/environment';
import { TaskDto } from '../../features/tasks/domain/task.models';
import { AuthService } from '../auth/auth.service';
import { LocalData } from '../offline/local-data';
import { SettingsService } from '../settings/settings.service';

interface Reminder {
  id: number;
  project: number;
  task: number;
  title: string;
  at: string;
}

interface Reminders {
  nextId: number;
  accounts: Record<string, Record<string, Reminder>>;
}

function emptyReminders(): Reminders {
  return { nextId: 1, accounts: {} };
}

type NotificationDriver = Pick<LocalNotificationsPlugin,
  'checkPermissions' | 'requestPermissions' | 'getPending' | 'getDeliveredNotifications' | 'cancel' | 'schedule'>
  & { onAction(listener: (event: ActionPerformed) => void): Promise<PluginListenerHandle> };

export const REMINDER_DRIVER = new InjectionToken<NotificationDriver | null>('NIVI reminders', {
  providedIn: 'root',
  factory: () => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('LocalNotifications') ? {
    checkPermissions: () => LocalNotifications.checkPermissions(),
    requestPermissions: () => LocalNotifications.requestPermissions(),
    getPending: () => LocalNotifications.getPending(),
    getDeliveredNotifications: () => LocalNotifications.getDeliveredNotifications(),
    cancel: options => LocalNotifications.cancel(options),
    schedule: options => LocalNotifications.schedule(options),
    onAction: listener => LocalNotifications.addListener('localNotificationActionPerformed', listener),
  } : null,
});

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly router = inject(Router);
  private readonly storage = inject(LocalData);
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly driver = inject(REMINDER_DRIVER);
  private reconciling = Promise.resolve();
  private listening = false;
  readonly problem = signal('');
  readonly enabled = computed(() => !!this.driver && this.settings.loaded() && this.settings.settings().enableReminders);
  readonly account = computed(() => this.auth.username() || this.auth.deviceAccount());

  async requestPermission(): Promise<boolean> {
    if (!this.driver || !this.enabled()) return false;
    try {
      const permission = await this.driver.checkPermissions();
      return permission.display === 'granted'
        || (await this.driver.requestPermissions()).display === 'granted';
    } catch {
      return false;
    }
  }

  start(): void {
    if (!this.driver || this.listening) return;
    this.listening = true;
    void this.driver.onAction(event => {
      void this.open(event.notification.id).catch(() => this.router.navigate(['/projects']));
    }).catch(() => this.problem.set('No se pudo iniciar la apertura de recordatorios.'));
  }

  async observe(account: string, project: number, taskId: number | undefined, method: string, body: unknown): Promise<void> {
    if (!this.driver || !account) return;
    try {
      await this.storage.change('reminders', emptyReminders, data => {
        const reminders = data.accounts[this.scope(account)] ??= {};
        const rows = (Array.isArray(body) ? body : body ? [body] : []) as TaskDto[];
        if (method === 'DELETE') {
          for (const [key, item] of Object.entries(reminders)) {
            if (item.project === project && item.task === taskId) delete reminders[key];
          }
        } else {
          const activeKeys = new Set<string>();
          for (const task of rows) {
            const key = `${project}:${task.clientRequestId ?? task.id}`;
            if (task.status !== 'DONE' && task.reminderAt && Number.isFinite(Date.parse(task.reminderAt))) {
              activeKeys.add(key);
              reminders[key] = {
                id: reminders[key]?.id ?? data.nextId++, project, task: task.id,
                title: task.title, at: task.reminderAt,
              };
            } else delete reminders[key];
          }
          if (Array.isArray(body)) {
            for (const [key, item] of Object.entries(reminders)) {
              if (item.project === project && !activeKeys.has(key)) delete reminders[key];
            }
          }
        }
      });
      await this.reconcile();
    } catch {
      this.problem.set('La tarea se guardó, pero no se pudo actualizar su recordatorio.');
    }
  }

  reconcile(): Promise<void> {
    if (!this.driver || !this.settings.loaded()) return Promise.resolve();
    this.reconciling = this.reconciling.then(() => this.apply()).catch(() => {
      this.problem.set('No se pudieron programar los recordatorios. Revisá los permisos de Android.');
    });
    return this.reconciling;
  }

  private scope(account: string): string { return `api:${environment.apiUrl}:${account}`; }

  private async apply(): Promise<void> {
    const driver = this.driver;
    if (!driver) return;
    const account = this.account();
    const reminders = account && this.enabled() && (await driver.checkPermissions()).display === 'granted'
      ? await this.storage.read('reminders', emptyReminders, state =>
        Object.values(state.accounts[this.scope(account)] ?? {}))
      : [];
    const [registered, delivered] = await Promise.all([driver.getPending(), driver.getDeliveredNotifications()]);
    // Android keeps delivered entries in the plugin registry until dismissal.
    const deliveredIds = new Set(delivered.notifications.map(item => item.id));
    const pendingById = new Map(registered.notifications.filter(item => !deliveredIds.has(item.id)).map(item => [item.id, item]));
    const now = Date.now();
    const future = reminders.filter(item => Date.parse(item.at) > now);
    const desired = new Set(reminders.filter(item => Date.parse(item.at) > now
      || pendingById.get(item.id)?.extra?.at === item.at || deliveredIds.has(item.id)).map(item => item.id));
    const cancels = registered.notifications.filter(item => !desired.has(item.id)).map(({ id }) => ({ id }));
    if (cancels.length) await driver.cancel({ notifications: cancels });

    const schedules = future.filter(item => {
      const current = registered.notifications.find(notification => notification.id === item.id);
      return current?.extra?.at !== item.at || current.body !== item.title;
    });
    if (schedules.length && this.account() === account && this.enabled()) {
      await driver.schedule({ notifications: schedules.map(item => ({
        id: item.id, title: 'Recordatorio de NIVI', body: item.title,
        extra: { at: item.at },
        schedule: { at: new Date(item.at), allowWhileIdle: true },
        isExactNotification: false,
      })) });
    }
    this.problem.set('');
  }

  private async open(id: number): Promise<void> {
    const account = this.account();
    if (!account) return;
    const target = await this.storage.read('reminders', emptyReminders, state =>
      Object.values(state.accounts[this.scope(account)] ?? {}).find(item => item.id === id));
    if (target) {
      await this.router.navigate(['/projects', target.project, 'tasks', target.task, 'edit'], {
        queryParams: { fromReminder: 1 },
      });
    } else await this.router.navigate(['/projects']);
  }
}
