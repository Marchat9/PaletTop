import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingPlayerConnectionPage } from './training-player-connection-page';

describe('TrainingPlayerConnectionPage', () => {
  let component: TrainingPlayerConnectionPage;
  let fixture: ComponentFixture<TrainingPlayerConnectionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingPlayerConnectionPage],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingPlayerConnectionPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
