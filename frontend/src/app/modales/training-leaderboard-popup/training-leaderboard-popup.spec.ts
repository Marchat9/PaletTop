import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  selectTrainingClubLeaderboard,
  selectTrainingClubLeaderboardError,
  selectTrainingClubLeaderboardIsLoading,
  selectTrainingLeaderboard,
  selectTrainingLeaderboardError,
  selectTrainingLeaderboardIsLoading,
} from 'src/app/store/training/training.selectors';
import {
  TrainingLeaderboardPopup,
  TrainingLeaderboardPopupData,
} from './training-leaderboard-popup';

function setup(data: TrainingLeaderboardPopupData, dialogRef = { close: vi.fn() }) {
  TestBed.configureTestingModule({
    imports: [TrainingLeaderboardPopup],
    providers: [
      { provide: DialogRef, useValue: dialogRef },
      { provide: DIALOG_DATA, useValue: data },
      provideMockStore({
        selectors: [
          {
            selector: selectTrainingClubLeaderboard,
            value: [
              { memberId: 'M1', name: 'Jean', wins: 3, points: 39, sessionsPlayed: 2 },
              { memberId: 'M2', name: 'Marie', wins: 1, points: 20, sessionsPlayed: 1 },
            ],
          },
          { selector: selectTrainingClubLeaderboardIsLoading, value: false },
          { selector: selectTrainingClubLeaderboardError, value: null },
          {
            selector: selectTrainingLeaderboard,
            value: [
              { participantId: 'P1', name: 'Julie', wins: 2, points: 26 },
              { participantId: 'P2', name: 'Pierre', wins: 1, points: 23 },
            ],
          },
          { selector: selectTrainingLeaderboardIsLoading, value: false },
          { selector: selectTrainingLeaderboardError, value: null },
        ],
      }),
    ],
  });
  const fixture = TestBed.createComponent(TrainingLeaderboardPopup);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('TrainingLeaderboardPopup', () => {
  it('affiche le classement du club, sans surbrillance pour un non-membre, et se ferme', () => {
    const dialogRef = { close: vi.fn() };
    const element = setup({ scope: 'club', highlightedId: null }, dialogRef);

    expect(element.textContent).toContain('Classement du club');
    expect(element.textContent).toContain('Jean');
    expect(element.querySelector('.is-highlighted')).toBeNull();

    element.querySelector<HTMLElement>('.popup-close')!.click();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('met en surbrillance le membre transmis à l’ouverture', () => {
    const element = setup({ scope: 'club', highlightedId: 'M2' });

    expect(element.querySelector('.is-highlighted')?.textContent).toContain('Marie');
  });

  it('affiche le classement de la séance et le joueur qui le lit', () => {
    const element = setup({ scope: 'session', highlightedId: 'P2' });

    expect(element.textContent).toContain('Classement de la séance');
    expect(element.textContent).not.toContain('Jean');
    expect(element.querySelector('.is-highlighted')?.textContent).toContain('Pierre');
  });
});
