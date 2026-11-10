import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionTraining } from './section-training';

describe('SectionTraining', () => {
  let component: SectionTraining;
  let fixture: ComponentFixture<SectionTraining>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionTraining],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionTraining);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('propose de suivre une séance en tant que spectateur', () => {
    const spectate = vi.fn();
    component.eventTrainingSpectate.subscribe(spectate);
    fixture.detectChanges();

    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('app-button'),
    ).find((element) => element.textContent?.includes('En tant que spectateur'));
    button!.querySelector<HTMLElement>('.button')!.click();

    expect(spectate).toHaveBeenCalled();
  });
});
