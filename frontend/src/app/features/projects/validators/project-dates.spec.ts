import { FormControl, FormGroup } from '@angular/forms';
import { dateValidator } from './project-dates';
describe('calendar dates', () => {
 afterEach(() => vi.useRealTimers());
 it('accepts today regardless of UTC conversion', () => {
 vi.useFakeTimers();vi.setSystemTime(new Date(2026,10,4,12));
 expect(dateValidator(new FormGroup({startDate:new FormControl('2026-11-04'),endDate:new FormControl('2026-11-04')}))).toBeNull();
 });
 it('rejects an end before today and start', () => {
 vi.useFakeTimers();vi.setSystemTime(new Date(2026,10,4,12));
 expect(dateValidator(new FormGroup({startDate:new FormControl('2026-11-04'),endDate:new FormControl('2026-11-03')}))).toEqual({endBeforeStart:true,endBeforeToday:true});
 });
});
