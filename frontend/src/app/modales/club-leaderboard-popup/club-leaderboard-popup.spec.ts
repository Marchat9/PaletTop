import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  selectTrainingClubLeaderboard,
  selectTrainingClubLeaderboardError,
  selectTrainingClubLeaderboardIsLoading,
} from 'src/app/store/training/training.selectors';
import { ClubLeaderboardPopup, ClubLeaderboardPopupData } from './club-leaderboard-popup';

function setup(dialogRef: { close: () => void }, data?: ClubLeaderboardPopupData) {
  TestBed.configureTestingModule({
    imports: [ClubLeaderboardPopup],
    providers: [
      { provide: DialogRef, useValue: dialogRef },
      ...(data ? [{ provide: DIALOG_DATA, useValue: data }] : []),
      provideMockStore({
        selectors: [
          {
            selector: selectTrainingClubLeaderboard,
            value: [
              { memberId: 'M1', name: 'Jean', wins: 3, points: 39 },
              { memberId: 'M2', name: 'Marie', wins: 1, points: 20 },
            ],
          },
          { selector: selectTrainingClubLeaderboardIsLoading, value: false },
          { selector: selectTrainingClubLeaderboardError, value: null },
        ],
      }),
    ],
  });
  const fixture = TestBed.createComponent(ClubLeaderboardPopup);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ClubLeaderboardPopup', () => {
  it('affiche le classement du club et se ferme', () => {
    const dialogRef = { close: vi.fn() };
    const element = setup(dialogRef);

    expect(element.textContent).toContain('Classement du club');
    expect(element.textContent).toContain('Jean');

    element.querySelector<HTMLElement>('.popup-close')!.click();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(element.querySelector('.is-me')).toBeNull();
  });

  it('met en surbrillance le membre transmis à l’ouverture', () => {
    const element = setup({ close: vi.fn() }, { myMemberId: 'M2' });

    expect(element.querySelector('.is-me')?.textContent).toContain('Marie');
  });
});
