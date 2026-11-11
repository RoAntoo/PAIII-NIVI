import { AbstractControl, ValidationErrors } from '@angular/forms';
export function dateValidator(control: AbstractControl): ValidationErrors | null {
 const start = control.get('startDate')?.value;
 const end = control.get('endDate')?.value;
 if (!start || !end) return null;
 const now = new Date();
 const today = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
 const errors: ValidationErrors = {};
 if (end < start) errors['endBeforeStart'] = true;
 if (end < today) errors['endBeforeToday'] = true;
 return Object.keys(errors).length ? errors : null;
}
