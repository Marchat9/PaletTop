import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingCreationPage } from './training-creation-page';

describe('TrainingCreationPage', () => {
  let component: TrainingCreationPage;
  let fixture: ComponentFixture<TrainingCreationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingCreationPage],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingCreationPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
