import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ProjectCreateComponent } from './projects/pages/project-create/project-create.component';
import { UpdateTaskComponent } from './tasks/pages/task-edit/update-task.component';
import { ProjectListComponent } from './projects/pages/project-list/project-list.component';
import { HomeComponent } from './home/pages/home/home.component';
import { routes } from '../app.routes';
import { environment } from '../../environments/environment';

const api = environment.apiUrl;
const project = { id: 12, name: 'Proyecto', startDate: '2099-01-01', endDate: '2099-02-01',
  status: 'ACTIVE', totalTasks: 3, completedTasks: 2 };

describe('project and task flows', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ projectId: '12', taskId: '34' }) } } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); vi.useRealTimers(); });

  it('blocks blank names and long descriptions before sending a request', () => {
    const fixture = TestBed.createComponent(ProjectCreateComponent);
    const component = fixture.componentInstance;
    component.projectForm.patchValue({ name: '   ', startDate: '2099-01-01', endDate: '2099-02-01' });
    component.onSubmit(); expect(component.projectForm.invalid).toBe(true);
    component.projectForm.patchValue({ name: 'Project', description: 'x'.repeat(256) });
    component.onSubmit(); expect(component.projectForm.invalid).toBe(true);
    http.expectNone(`${api}/projects`);
  });

  it('shows validation errors from the server without clearing project fields', () => {
    const component = TestBed.createComponent(ProjectCreateComponent).componentInstance;
    component.projectForm.patchValue({ name: 'Project', startDate: '2099-01-01', endDate: '2099-02-01' });
    component.onSubmit();
    http.expectOne(`${api}/projects`).flush({ message: 'Project description is invalid' }, { status: 400, statusText: 'Bad Request' });
    expect(component.error()).toBe('Project description is invalid');
    expect(component.projectForm.controls.name.value).toBe('Project');
    expect(component.loading()).toBe(false);
    component.onSubmit();
    http.expectOne(`${api}/projects`).flush({ code: 'BUSINESS_RULE', message: 'End date must be today or later' }, { status: 409, statusText: 'Conflict' });
    expect(component.error()).toBe('End date must be today or later');
    component.onSubmit();
    http.expectOne(`${api}/projects`).flush({ code: 'DUPLICATE_RESOURCE', message: 'Duplicate name' }, { status: 409, statusText: 'Conflict' });
    expect(component.error()).toContain('El nombre del proyecto ya existe');
  });

  it('rejects fractional hours and preserves task fields after a failed save', () => {
    const fixture = TestBed.createComponent(UpdateTaskComponent); fixture.detectChanges();
    http.expectOne(`${api}/projects/12/tasks/34`).flush({ id: 34, title: 'Original', estimateHours: 2, assignee: 'Ana', status: 'TODO' });
    const component = fixture.componentInstance;
    component.form.patchValue({ estimateHours: 1.5 }); component.onSubmit();
    expect(component.form.invalid).toBe(true);
    component.form.patchValue({ title: 'Changed', estimateHours: 3, assignee: '' }); component.onSubmit();
    const save = http.expectOne(`${api}/projects/12/tasks/34`);
    expect(save.request.method).toBe('PUT'); expect(save.request.body.assignee).toBeNull();
    save.flush({ message: 'Cannot modify a task in a CLOSED project' }, { status: 409, statusText: 'Conflict' });
    expect(component.form.controls.title.value).toBe('Changed');
    expect(component.isSaving()).toBe(false);
    expect(component.errorMessage()).toContain('CLOSED');
  });

  it('cancels deletion without a request and refreshes the list after confirmation', () => {
    const fixture = TestBed.createComponent(ProjectListComponent); fixture.detectChanges();
    http.expectOne(`${api}/projects`).flush([project]); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.deleteProject(12, 'Proyecto'); fixture.detectChanges();
    (fixture.nativeElement.querySelector('.btn-modal-cancel') as HTMLButtonElement).click(); fixture.detectChanges();
    http.expectNone(request => request.method === 'DELETE');
    expect(component.projects().length).toBe(1);
    component.deleteProject(12, 'Proyecto'); fixture.detectChanges();
    (fixture.nativeElement.querySelector('.btn-modal-confirm') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(component.isDeleting()).toBe(true);
    http.expectOne(`${api}/projects/12`).flush(null);
    http.expectOne(`${api}/projects`).flush([]); fixture.detectChanges();
    expect(component.projects()).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role=dialog]')).toBeNull();
  });

  it('requests only three projects and renders actual task progress', () => {
    const fixture = TestBed.createComponent(HomeComponent); fixture.detectChanges();
    http.expectOne(`${api}/projects?limit=3`).flush([project]);
    http.expectOne(`${api}/projects/recent-tasks`).flush([]); fixture.detectChanges();
    const progress = fixture.nativeElement.querySelector('[role=progressbar]');
    expect(progress.getAttribute('aria-valuenow')).toBe('67');
    expect(fixture.nativeElement.textContent).toContain('2 de 3 tareas completadas');
    expect(fixture.componentInstance.progress({ ...project, status: 'ACTIVE', totalTasks: 0, completedTasks: 0 })).toBe(0);
  });
});

describe('protected routes', () => {
  it('redirects anonymous visits to login while preserving the requested route', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects/12/tasks');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fprojects%2F12%2Ftasks');
    expect(harness.routeNativeElement?.textContent).toContain('Ingresar a Nivi');
    TestBed.inject(HttpTestingController).verify();
  });
});
