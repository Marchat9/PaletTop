import { DialogModule, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  selectSpectatorTournamentData,
  selectSpectatorTournamentError,
  selectSpectatorTournamentIsLoading,
} from 'src/app/store/spectator/spectator.selectors';
import { loadSpectatorTournament } from 'src/app/store/spectator/spectator.actions';
import { SpectateTournamentPopupComponent } from './spectate-tournament-popup';

function setup() {
  const dialogRef = { close: vi.fn() } as unknown as DialogRef;

  TestBed.configureTestingModule({
    imports: [DialogModule, SpectateTournamentPopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRef },
      provideMockStore({
        selectors: [
          { selector: selectSpectatorTournamentData, value: null },
          { selector: selectSpectatorTournamentError, value: null },
          { selector: selectSpectatorTournamentIsLoading, value: false },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(SpectateTournamentPopupComponent);
  const store = TestBed.inject(MockStore);
  fixture.detectChanges();

  return { fixture, store, dialogRef };
}

describe('SpectateTournamentPopupComponent', () => {
  it('dispatches loadSpectatorTournament with the trimmed uppercased code on join', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onTournamentCodeInput('  abc123  ');

    fixture.componentInstance.onJoin();

    expect(dispatchSpy).toHaveBeenCalledWith(loadSpectatorTournament({ tournamentCode: 'ABC123' }));
  });

  it('does not dispatch when the code is empty', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onJoin();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: loadSpectatorTournament.type }),
    );
  });

  it('closes the dialog with undefined on cancel', () => {
    const { fixture, dialogRef } = setup();

    fixture.componentInstance.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
