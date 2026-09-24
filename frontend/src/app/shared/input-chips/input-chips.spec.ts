import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { InputChipOption, InputChips } from './input-chips';

@Component({
  imports: [InputChips],
  template: `<app-input-chips
    [options]="options"
    [value]="value()"
    (valueChange)="value.set($event)"
  />`,
})
class HostComponent {
  readonly options: InputChipOption[] = [
    { value: 1, label: '1' },
    { value: 2, label: '2', locked: true },
    { value: 3, label: '3' },
  ];
  readonly value = signal<number[]>([3]);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const chips = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.chip'));
  return { fixture, chips };
}

describe('InputChips', () => {
  it('montre comme cochées les valeurs reçues', () => {
    const { chips } = setup();

    expect(chips()[0].classList).not.toContain('selected');
    expect(chips()[2].classList).toContain('selected');
  });

  it('ajoute et retire une valeur au clic', () => {
    const { fixture, chips } = setup();

    chips()[0].querySelector('input')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toEqual([1, 3]);

    chips()[2].querySelector('input')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toEqual([1]);
  });

  // La taille visée est là par construction : on la montre sans laisser croire qu'on peut l'ôter.
  it('affiche la valeur verrouillée comme cochée et refuse de la retirer', () => {
    const { fixture, chips } = setup();

    expect(chips()[1].classList).toContain('selected');
    expect(chips()[1].querySelector('input')!.disabled).toBe(true);

    chips()[1].querySelector('input')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toEqual([3]);
  });

  it('renvoie toujours une liste triée', () => {
    const { fixture, chips } = setup();

    chips()[0].querySelector('input')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toEqual([1, 3]);
  });
});
