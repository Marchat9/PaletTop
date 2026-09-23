import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingAdminConnectionPage } from './training-admin-connection-page';

describe('TrainingAdminConnectionPage', () => {
  let component: TrainingAdminConnectionPage;
  let fixture: ComponentFixture<TrainingAdminConnectionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingAdminConnectionPage],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingAdminConnectionPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
