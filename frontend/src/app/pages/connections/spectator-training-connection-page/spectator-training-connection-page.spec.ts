import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SpectatorTrainingConnectionPage } from './spectator-training-connection-page';

function setup(closedValue: unknown) {
  const routerMock = { navigate: vi.fn() };
  const dialogMock = { open: vi.fn().mockReturnValue({ closed: of(closedValue) }) };

  TestBed.configureTestingModule({
    imports: [SpectatorTrainingConnectionPage],
    providers: [
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: dialogMock },
    ],
  });

  TestBed.createComponent(SpectatorTrainingConnectionPage);
  return { routerMock };
}

describe('SpectatorTrainingConnectionPage', () => {
  it('ouvre la page spectateur de la séance saisie', () => {
    const { routerMock } = setup({ sessionCode: '123456' });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/spectateur/training', '123456']);
  });

  it("revient à l'accueil quand la saisie est annulée", () => {
    const { routerMock } = setup(undefined);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/accueil']);
  });
});
