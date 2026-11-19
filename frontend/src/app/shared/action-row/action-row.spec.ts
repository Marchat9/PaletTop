import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionRow } from './action-row';

describe('ActionRow', () => {
  let fixture: ComponentFixture<ActionRow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionRow],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionRow);
    fixture.componentRef.setInput('icon', 'add_moderator');
    fixture.componentRef.setInput('title', 'Créer un tournoi');
  });

  it('displays the title and the description when given', () => {
    fixture.componentRef.setInput('description', 'Règles, équipes et tirages');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.title')?.textContent).toContain('Créer un tournoi');
    expect(element.querySelector('.description')?.textContent).toContain(
      'Règles, équipes et tirages',
    );
  });

  it('hides the description when none is given', () => {
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.description')).toBeNull();
  });

  it('emits clicked when the row is clicked', () => {
    const clicked = vi.fn();
    fixture.componentInstance.clicked.subscribe(clicked);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();

    expect(clicked).toHaveBeenCalled();
  });
});
