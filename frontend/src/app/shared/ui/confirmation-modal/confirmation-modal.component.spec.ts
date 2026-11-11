import { TestBed } from '@angular/core/testing';
import { ConfirmationModalComponent } from './confirmation-modal.component';

describe('confirmation dialog keyboard access', () => {
  it('labels the dialog, traps focus, handles Escape and restores the opener', async () => {
    const opener = document.createElement('button');
    document.body.append(opener); opener.focus();
    const fixture = TestBed.createComponent(ConfirmationModalComponent);
    const cancel = vi.fn(); fixture.componentInstance.cancel.subscribe(cancel);
    fixture.detectChanges(); await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('[role=dialog]') as HTMLElement;
    const buttons = dialog.querySelectorAll('button');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toContain('Confirmación');
    expect(document.activeElement).toBe(buttons[0]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[1]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[0]);
    fixture.componentRef.setInput('isLoading', true); fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancel).not.toHaveBeenCalled();
    fixture.componentRef.setInput('isLoading', false); fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancel).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).not.toBe('hidden');
    opener.remove();
  });
});
