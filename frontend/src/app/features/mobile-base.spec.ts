import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { TaskListComponent } from './tasks/pages/task-list/task-list.component';
import { CreateTaskComponent } from './tasks/pages/task-create/create-task.component';
import { UpdateTaskComponent } from './tasks/pages/task-edit/update-task.component';
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
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ projectId: '12', taskId: '34' }) } } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); vi.useRealTimers(); });

  it('reuses the same creation key after status 0 even if the task list is still empty', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CreateTaskComponent);
    fixture.detectChanges();
    vi.useFakeTimers();
    const component = fixture.componentInstance;
    component.form.patchValue({ title: task.title, estimateHours: 1 });
    component.onSubmit();
    const first = http.expectOne(path);
    const body = first.request.body;
    first.error(new ProgressEvent('error'));
    expect(component.errorMessage()).toContain('No pudimos confirmar');
    expect(component.form.disabled).toBe(true);
    const list = TestBed.createComponent(TaskListComponent);
    list.detectChanges();
    http.expectOne(path).flush([]); // Initial request may still be processing on the server.
    component.onSubmit();
    const retry = http.expectOne(path);
    expect(retry.request.body).toEqual(body);
    expect(body.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(navigate).not.toHaveBeenCalled();
    retry.flush({ ...task, clientRequestId: body.clientRequestId });
    vi.advanceTimersByTime(2000);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('sends explicitly touched fields on retry even when reverted to their original values', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(UpdateTaskComponent);
    fixture.detectChanges();
    http.expectOne(`${path}/34`).flush({ ...task, category: 'GENERAL' });
    const component = fixture.componentInstance;
    component.form.patchValue({ status: 'DONE', category: 'COMPRAS' });
    component.form.controls.status.markAsDirty();
    component.form.controls.category.markAsDirty();
    component.onSubmit();
    http.expectOne(`${path}/34`).error(new ProgressEvent('error')); // Server may have committed DONE/COMPRAS.
    component.form.patchValue({ status: 'TODO', category: 'GENERAL' });
    component.onSubmit();
    const retry = http.expectOne(`${path}/34`);
    expect(retry.request.body.status).toBe('TODO');
    expect(retry.request.body.category).toBe('GENERAL');
    expect(navigate).not.toHaveBeenCalled();
    retry.flush({ ...task, category: 'GENERAL' });
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('asks for confirmation before resetting corrupt preferences', async () => {
    const storage = TestBed.inject(SETTINGS_STORAGE);
    vi.spyOn(storage, 'get').mockResolvedValue({ value: '{' });
    const save = vi.spyOn(storage, 'set').mockResolvedValue(undefined);
    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.componentInstance.preferences.ready;
    fixture.detectChanges();
    const reset = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.includes('Restablecer ajustes'))!;
    reset.click(); fixture.detectChanges();
    expect(save).not.toHaveBeenCalled();
    (fixture.nativeElement.querySelector('.btn-modal-cancel') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(save).not.toHaveBeenCalled();
    reset.click(); fixture.detectChanges();
    (fixture.nativeElement.querySelector('.btn-modal-confirm') as HTMLButtonElement).click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(save).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(false);
  });

  it('reconciles a task already absent on the server when deletion returns 404', () => {
    const fixture = TestBed.createComponent(TaskListComponent);
    fixture.detectChanges();
    http.expectOne(path).flush([task]);
    const component = fixture.componentInstance;
    component.requestDelete(component.tasks()[0]);
    component.confirmDelete();
    http.expectOne(`${path}/34`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(component.tasks()).toEqual([]);
    expect(component.pendingDelete()).toBeNull();
    expect(component.deleteError()).toBeNull();
    expect(component.isDeleting()).toBe(false);
    component.confirmDelete();
    http.expectNone(request => request.method === 'DELETE');
  });

  it('keeps a closed-project task and its dialog after a 409 deletion response', () => {
    const fixture = TestBed.createComponent(TaskListComponent);
    fixture.detectChanges();
    http.expectOne(path).flush([task]);
    const component = fixture.componentInstance;
    component.requestDelete(component.tasks()[0]);
    component.confirmDelete();
    http.expectOne(`${path}/34`).flush(null, { status: 409, statusText: 'Conflict' });
    expect(component.tasks()).toHaveLength(1);
    expect(component.pendingDelete()).not.toBeNull();
    expect(component.deleteError()).toContain('proyecto cerrado');
  });

  it('warns about an unknown create outcome when a saved task response is lost', () => {
    const fixture = TestBed.createComponent(CreateTaskComponent);
    fixture.detectChanges();
    vi.useFakeTimers();
    const component = fixture.componentInstance;
    component.form.patchValue({ title: task.title, estimateHours: 1 });
    component.onSubmit();
    const request = http.expectOne(path);
    // The server commits the task, but its response never reaches the client.
    const serverTasks = [{ ...task, title: request.request.body.title }];
    vi.advanceTimersByTime(15001);
    expect(request.cancelled).toBe(true);
    expect(component.successMessage()).toBeNull();
    expect(component.loading()).toBe(false);
    expect(component.form.controls.title.value).toBe(task.title);
    expect(component.errorMessage()).toContain('No pudimos confirmar si la tarea se guardó');
    expect(component.errorMessage()).toContain('Revisá la lista de tareas antes de reintentar');
    http.expectNone(req => req.method === 'POST');
    const list = TestBed.createComponent(TaskListComponent);
    list.detectChanges();
    http.expectOne(path).flush(serverTasks);
    expect(list.componentInstance.tasks()).toHaveLength(1);
    expect(list.componentInstance.tasks()[0].title).toBe(task.title);
  });

  it.each([
    { status: 'TODO' as const, category: 'GENERAL' as const, expected: {} },
    { status: 'DONE' as const, category: 'GENERAL' as const, expected: { status: 'DONE' } },
    { status: 'TODO' as const, category: 'COMPRAS' as const, expected: { category: 'COMPRAS' } },
    { status: 'DONE' as const, category: 'COMPRAS' as const, expected: { status: 'DONE', category: 'COMPRAS' } },
  ])('sends only changed status/category values: $expected', ({ status, category, expected }) => {
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(UpdateTaskComponent);
    fixture.detectChanges();
    http.expectOne(`${path}/34`).flush({ ...task, category: 'GENERAL' });
    fixture.componentInstance.form.patchValue({ title: 'Título editado', status, category });
    fixture.componentInstance.onSubmit();
    const request = http.expectOne(`${path}/34`);
    expect(request.request.body).toEqual({ title: 'Título editado', estimateHours: 1, assignee: null, ...expected });
    request.flush({ ...task, title: 'Título editado', status, category });
  });

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
