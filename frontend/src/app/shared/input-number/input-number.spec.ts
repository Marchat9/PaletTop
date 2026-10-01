import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { InputNumber } from './input-number';

@Component({
  imports: [InputNumber],
  template: `<app-input-number
    [value]="value()"
    [min]="1"
    [max]="6"
    (valueChange)="value.set($event)"
  />`,
})
class HostComponent {
  readonly value = signal(2);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
  const type = (text: string) => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, input, type };
}

describe('InputNumber', () => {
  // `min`/`max` on a native number input are advisory: the browser lets anything be typed.
  it('ramène une saisie au-dessus du maximum', () => {
    const { fixture, type } = setup();

    type('99');

    expect(fixture.componentInstance.value()).toBe(6);
  });

  it('ramène une saisie en dessous du minimum', () => {
    const { fixture, type } = setup();

    type('-4');

    expect(fixture.componentInstance.value()).toBe(1);
  });

  it('laisse passer une saisie dans les bornes', () => {
    const { fixture, type } = setup();

    type('4');

    expect(fixture.componentInstance.value()).toBe(4);
  });

  it('borne aussi les flèches', () => {
    const { fixture } = setup();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');

    for (let click = 0; click < 10; click++) {
      buttons[0].dispatchEvent(new Event('click'));
      fixture.detectChanges();
    }

    expect(fixture.componentInstance.value()).toBe(6);
  });
});
