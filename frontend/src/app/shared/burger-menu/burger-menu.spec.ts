import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BurgerMenu } from './burger-menu';

describe('BurgerMenu', () => {
  let component: BurgerMenu;
  let fixture: ComponentFixture<BurgerMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BurgerMenu],
    }).compileComponents();

    fixture = TestBed.createComponent(BurgerMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
