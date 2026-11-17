import { DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { shouldDismiss, SwipeToDismissDirective } from './swipe-to-dismiss.directive';

describe('shouldDismiss', () => {
  it('ferme au-delà du quart de la hauteur, même lentement', () => {
    expect(shouldDismiss(100, 2000, 400)).toBe(true);
  });

  it('ferme sur un geste rapide, même court', () => {
    expect(shouldDismiss(60, 80, 400)).toBe(true);
  });

  it('revient en place sur un glissement court et lent', () => {
    expect(shouldDismiss(60, 1000, 400)).toBe(false);
  });

  it('ne ferme pas sans déplacement vers le bas', () => {
    expect(shouldDismiss(0, 10, 400)).toBe(false);
  });
});

@Component({
  imports: [SwipeToDismissDirective],
  template: `<div class="sheet" appSwipeToDismiss><p class="content">Contenu</p></div>`,
})
class SheetHost {}

function touch(target: HTMLElement, type: string, x: number, y: number): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: [{ clientX: x, clientY: y }] });
  target.dispatchEvent(event);
}

describe('SwipeToDismissDirective', () => {
  function setup() {
    const close = vi.fn();
    TestBed.configureTestingModule({
      imports: [SheetHost],
      providers: [{ provide: DialogRef, useValue: { close } }],
    });
    const fixture = TestBed.createComponent(SheetHost);
    fixture.detectChanges();
    const sheet = fixture.nativeElement.querySelector('.sheet') as HTMLElement;
    return { close, sheet, content: sheet.querySelector('.content') as HTMLElement };
  }

  it('ferme la popup quand on la glisse vers le bas', () => {
    vi.useFakeTimers();
    const { close, sheet, content } = setup();

    touch(content, 'touchstart', 100, 100);
    touch(content, 'touchmove', 100, 130);
    touch(content, 'touchmove', 100, 400);
    touch(content, 'touchend', 100, 400);
    vi.runAllTimers();

    expect(close).toHaveBeenCalledWith();
    expect(sheet.style.transform).toBe('translateY(100%)');
    vi.useRealTimers();
  });

  it('ignore un glissement horizontal', () => {
    const { close, sheet, content } = setup();

    touch(content, 'touchstart', 100, 100);
    touch(content, 'touchmove', 200, 105);
    touch(content, 'touchmove', 300, 400);
    touch(content, 'touchend', 300, 400);

    expect(close).not.toHaveBeenCalled();
    expect(sheet.style.transform).toBe('');
  });

  it('laisse défiler une liste qui n’est pas en haut', () => {
    const { close, content } = setup();
    Object.defineProperty(content, 'scrollTop', { value: 50 });

    touch(content, 'touchstart', 100, 100);
    touch(content, 'touchmove', 100, 400);
    touch(content, 'touchend', 100, 400);

    expect(close).not.toHaveBeenCalled();
  });
});
