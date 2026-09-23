import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinTrainingPopup } from './join-training-popup';

describe('JoinTrainingPopup', () => {
  let component: JoinTrainingPopup;
  let fixture: ComponentFixture<JoinTrainingPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinTrainingPopup],
    }).compileComponents();

    fixture = TestBed.createComponent(JoinTrainingPopup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
