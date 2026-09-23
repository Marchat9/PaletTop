import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTrainingPage } from './admin-training-page';

describe('AdminTrainingPage', () => {
  let component: AdminTrainingPage;
  let fixture: ComponentFixture<AdminTrainingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTrainingPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTrainingPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
