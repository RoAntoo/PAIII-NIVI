import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReminderService } from '../../../../core/device/reminder.service';
import { TaskReminderComponent } from './task-reminder.component';

describe('task reminder input', () => {
  it('rejects the selected date if it expires while permission is pending', async () => {
    let allow!: (granted: boolean) => void;
    const permission = new Promise<boolean>(resolve => { allow = resolve; });
    TestBed.configureTestingModule({ providers: [
      { provide: ReminderService, useValue: { enabled: signal(true), requestPermission: () => permission } },
    ] });
    const fixture = TestBed.createComponent(TaskReminderComponent);
    const previous = '2099-01-02T10:00:00Z';
    fixture.componentRef.setInput('at', previous);
    fixture.detectChanges();
    const field: HTMLInputElement = fixture.nativeElement.querySelector('input');
    field.value = '2099-01-01T10:00';
    field.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.checking()).toBe(true);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(new Date(field.value).getTime() + 1);
    try {
      allow(true);
      await vi.waitFor(() => expect(fixture.componentInstance.message()).toContain('ya pasó'));
      expect(fixture.componentInstance.at()).toBe(previous);
      expect(fixture.componentInstance.checking()).toBe(false);
    } finally { clock.mockRestore(); }
  });
  it('leaves the optional value empty when Android denies notification permission', async () => {
    const requestPermission = vi.fn().mockResolvedValue(false);
    TestBed.configureTestingModule({ providers: [
      { provide: ReminderService, useValue: { enabled: signal(true), requestPermission } },
    ] });
    const fixture = TestBed.createComponent(TaskReminderComponent);
    fixture.detectChanges();
    const field: HTMLInputElement = fixture.nativeElement.querySelector('input');
    field.value = '2099-01-01T10:00';
    field.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(fixture.componentInstance.message()).toContain('Podés guardar la tarea'));
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.at()).toBeNull();
    expect(field.value).toBe('');
  });
});
