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
});
