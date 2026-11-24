import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { concatMap, defer, filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OfflineService, SKIP_OFFLINE } from './offline.service';
import { ReminderService } from '../device/reminder.service';

export const offlineInterceptor: HttpInterceptorFn = (request, next) => {
  const prefix = `${environment.apiUrl}/projects`;
  if (request.context.get(SKIP_OFFLINE) || (request.url !== prefix && !request.url.startsWith(prefix + '/'))) return next(request);
  const offline = inject(OfflineService);
  const route = request.url.slice(environment.apiUrl.length);
  const task = /^\/projects\/(\d+)\/tasks(?:\/(-?\d+))?$/.exec(route);
  const forward = () => next(request).pipe(filter((event): event is HttpResponse<unknown> => event instanceof HttpResponse));
  const intercepted = !!offline.account() && (request.method === 'GET' || !!task);
  let response = intercepted
    ? defer(() => offline.handle(request, route, forward)) : next(request);
  if (task && (!intercepted || request.method === 'GET')) {
    const reminders = inject(ReminderService);
    const account = reminders.account();
    if (account) response = response.pipe(concatMap(async event => {
      if (event instanceof HttpResponse) {
        await reminders.observe(account, Number(task[1]), task[2] ? Number(task[2]) : undefined, request.method, event.body);
      }
      return event;
    }));
  }
  return response;
};
