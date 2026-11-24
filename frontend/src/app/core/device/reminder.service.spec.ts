import 'fake-indexeddb/auto';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LocalNotificationSchema } from '@capacitor/local-notifications';
import { AuthService } from '../auth/auth.service';
import { DEFAULT_SETTINGS, SettingsService } from '../settings/settings.service';
import { REMINDER_DRIVER, ReminderService } from './reminder.service';

describe('task reminders', () => {
  it('keeps a stable pending ID, replaces the date and cancels on completion, deletion and opt-out', async () => {
    const account = crypto.randomUUID();
    const pending = new Map<number, LocalNotificationSchema>();
    const schedule = vi.fn(async ({ notifications }: { notifications: LocalNotificationSchema[] }) => {
      notifications.forEach(notification => pending.set(notification.id, notification));
      return { notifications };
    });
    const settings = signal({ ...DEFAULT_SETTINGS });
    const driver = {
      checkPermissions: async () => ({ display: 'granted' }),
      getPending: async () => ({ notifications: [...pending.values()] }),
      getDeliveredNotifications: async () => ({ notifications: [] }),
      schedule,
      cancel: async ({ notifications }: { notifications: { id: number }[] }) => {
        notifications.forEach(notification => pending.delete(notification.id));
      },
    };
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), { provide: REMINDER_DRIVER, useValue: driver },
      { provide: AuthService, useValue: { username: () => account } },
      { provide: SettingsService, useValue: { loaded: signal(true), settings } },
    ] });
    const reminders = TestBed.inject(ReminderService);
    const task = { id: 1, title: 'Comprar clavos', status: 'TODO', reminderAt: '2099-01-01T10:00:00Z' };
    await reminders.observe(account, 2, 1, 'PUT', task);
    const first = [...pending.values()][0];
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(task.reminderAt) + 1);
    await reminders.reconcile();
    expect(pending.has(first.id)).toBe(true);
    expect(schedule).toHaveBeenCalledTimes(1);
    clock.mockRestore();
    expect(first.isExactNotification).toBe(false);
    await reminders.reconcile();
    expect(schedule).toHaveBeenCalledTimes(1);
    await reminders.observe(account, 2, 1, 'PUT', { ...task, reminderAt: '2099-01-02T11:00:00Z' });
    expect(pending.size).toBe(1);
    expect(pending.get(first.id)?.schedule?.at).toEqual(new Date('2099-01-02T11:00:00Z'));
    await reminders.observe(account, 2, 1, 'PUT', { ...task, status: 'DONE' });
    expect(pending.size).toBe(0);
    await reminders.observe(account, 2, 1, 'PUT', task);
    await reminders.observe(account, 2, 1, 'DELETE', null);
    expect(pending.size).toBe(0);
    await reminders.observe(account, 2, 1, 'PUT', task);
    settings.set({ ...DEFAULT_SETTINGS, enableReminders: false });
    await reminders.reconcile();
    expect(pending.size).toBe(0);
  });
});
