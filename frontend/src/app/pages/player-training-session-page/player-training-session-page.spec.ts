import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerTrainingSessionPage } from './player-training-session-page';

describe('PlayerTrainingSessionPage', () => {
  let component: PlayerTrainingSessionPage;
  let fixture: ComponentFixture<PlayerTrainingSessionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerTrainingSessionPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerTrainingSessionPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
