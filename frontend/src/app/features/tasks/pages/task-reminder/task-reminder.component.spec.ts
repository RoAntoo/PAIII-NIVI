import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReminderService } from '../../../../core/device/reminder.service';
import { TaskReminderComponent } from './task-reminder.component';

describe('task reminder input', () => {
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
