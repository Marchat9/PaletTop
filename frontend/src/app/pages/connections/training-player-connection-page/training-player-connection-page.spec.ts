import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TrainingPlayerConnectionPage } from './training-player-connection-page';

function setup(closedValue: unknown) {
  const routerMock = { navigate: vi.fn() };
  const dialogMock = { open: vi.fn().mockReturnValue({ closed: of(closedValue) }) };

  TestBed.configureTestingModule({
    imports: [TrainingPlayerConnectionPage],
    providers: [
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: dialogMock },
    ],
  });

  const fixture = TestBed.createComponent(TrainingPlayerConnectionPage);
  return { fixture, routerMock, dialogMock };
}

describe('TrainingPlayerConnectionPage', () => {
  it('creates the component', () => {
    const { fixture } = setup(undefined);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('navigates to the player training session page using the popup result', () => {
    const { routerMock } = setup({ sessionCode: '1234', participantCode: '5678' });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/player/training/1234/5678']);
  });

  it('navigates back to accueil when the popup is cancelled', () => {
    const { routerMock } = setup(undefined);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/accueil']);
  });
});
