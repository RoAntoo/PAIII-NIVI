import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TaskListComponent } from './tasks/pages/task-list/task-list.component';
import { CreateTaskComponent } from './tasks/pages/task-create/create-task.component';
import { SettingsComponent } from './settings/settings.component';
import { SettingsService, SETTINGS_STORAGE } from '../core/settings/settings.service';
import { environment } from '../../environments/environment';

describe('mobile base screens', () => {
  let http: HttpTestingController;
  const path = `${environment.apiUrl}/projects/12/tasks`;
  const task = { id: 34, title: 'Comprar tornillos', estimateHours: 1, assignee: null, status: 'TODO' };
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ projectId: '12' }) } } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); });

  it('keeps the task list after a failed deletion and permits a confirmed retry', () => {
    const fixture = TestBed.createComponent(TaskListComponent);
    fixture.detectChanges();
    http.expectOne(path).flush([task]);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.requestDelete(component.tasks()[0]);
    component.cancelDelete();
    http.expectNone(request => request.method === 'DELETE');
    component.requestDelete(component.tasks()[0]);
    component.confirmDelete();
    http.expectOne(`${path}/34`).flush(null, { status: 503, statusText: 'Unavailable' });
    expect(component.tasks()).toHaveLength(1);
    expect(component.pendingDelete()).not.toBeNull();
    expect(component.deleteError()).toContain('intentá de nuevo');
    component.confirmDelete();
    http.expectOne(`${path}/34`).flush(null);
    expect(component.tasks()).toHaveLength(0);
    expect(component.pendingDelete()).toBeNull();
  });

  it('shows a retry action when loading tasks fails and recovers from it', () => {
    const fixture = TestBed.createComponent(TaskListComponent);
    fixture.detectChanges();
    http.expectOne(path).flush(null, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    const retry = fixture.nativeElement.querySelector('.error-card button') as HTMLButtonElement;
    expect(retry.textContent).toContain('Reintentar');
    retry.click();
    http.expectOne(path).flush([task]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Comprar tornillos');
    expect(fixture.componentInstance.error()).toBeNull();
  });

  it('keeps create fields after backend failure and blocks blank titles', () => {
    const fixture = TestBed.createComponent(CreateTaskComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.patchValue({ title: '  ', estimateHours: 1 });
    component.onSubmit();
    http.expectNone(path);
    component.form.patchValue({ title: 'Comprar tornillos' });
    component.onSubmit();
    http.expectOne(path).flush(null, { status: 503, statusText: 'Unavailable' });
    expect(component.form.controls.title.value).toBe('Comprar tornillos');
    expect(component.loading()).toBe(false);
    expect(component.successMessage()).toBeNull();
    expect(component.errorMessage()).not.toBeNull();
  });

  it('renders six future-module switches and restores a switch after a storage error', async () => {
    vi.spyOn(TestBed.inject(SETTINGS_STORAGE), 'set').mockRejectedValue(new Error('Storage unavailable'));
    const fixture = TestBed.createComponent(SettingsComponent);
    const preferences = TestBed.inject(SettingsService);
    await preferences.ready;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[role=switch]')).toHaveLength(6);
    expect(fixture.nativeElement.textContent).toContain('Disponible después de implementar PR 02');
    const voice = fixture.nativeElement.querySelector('#enableVoice') as HTMLInputElement;
    voice.checked = false;
    await fixture.componentInstance.change('enableVoice', { target: voice } as unknown as Event);
    fixture.detectChanges();
    expect(voice.checked).toBe(true);
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('No se pudo guardar');
  });
});
