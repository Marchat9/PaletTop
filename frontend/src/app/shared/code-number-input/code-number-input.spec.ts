import { TestBed } from '@angular/core/testing';
import { CodeNumberInputComponent } from './code-number-input';

function setup() {
  const fixture = TestBed.createComponent(CodeNumberInputComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

/** A box holding what was typed in it. */
function box(value: string): HTMLInputElement {
  return { value } as HTMLInputElement;
}

function pasteEvent(text: string): ClipboardEvent {
  return {
    preventDefault: () => undefined,
    clipboardData: { getData: () => text },
  } as unknown as ClipboardEvent;
}

describe('CodeNumberInputComponent', () => {
  it('signals completion when the last digit is typed', () => {
    const component = setup();
    const completed = vi.fn();
    component.completed.subscribe(completed);

    ['1', '2', '3'].forEach((digit, index) => component.onDigitInput(box(digit), index));
    expect(completed).not.toHaveBeenCalled();

    component.onDigitInput(box('4'), 3);
    expect(completed).toHaveBeenCalledTimes(1);
  });

  it('hands the digits pasted beyond the group to the next one', () => {
    const component = setup();
    const overflow = vi.fn();
    component.overflow.subscribe(overflow);

    component.onDigitPaste(pasteEvent('1234 5678'), 0);

    expect(component.getCode()).toBe('1234');
    expect(overflow).toHaveBeenCalledWith('5678');
  });

  it('fills a group from digits handed over', () => {
    const component = setup();
    component.fill('5678');
    expect(component.getCode()).toBe('5678');
  });

  it('keeps a single digit in a box, even when the same digit is typed again', () => {
    const component = setup();
    const input = box('11');

    component.onDigitInput(input, 0);

    expect(input.value).toBe('1');
    expect(component.getCode()).toBe('1');
  });

  it('keeps the last digit typed and drops anything else', () => {
    const component = setup();
    const replaced = box('57');
    const letters = box('e-');

    component.onDigitInput(replaced, 0);
    component.onDigitInput(letters, 1);

    expect(replaced.value).toBe('7');
    expect(letters.value).toBe('');
    expect(component.getCode()).toBe('7');
  });
});
