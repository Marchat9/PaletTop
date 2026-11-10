import { DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  selectTrainingClubLeaderboard,
  selectTrainingClubLeaderboardError,
  selectTrainingClubLeaderboardIsLoading,
} from 'src/app/store/training/training.selectors';
import { ClubLeaderboardPopup } from './club-leaderboard-popup';

describe('ClubLeaderboardPopup', () => {
  it('affiche le classement du club et se ferme', () => {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ClubLeaderboardPopup],
      providers: [
        { provide: DialogRef, useValue: dialogRef },
        provideMockStore({
          selectors: [
            {
              selector: selectTrainingClubLeaderboard,
              value: [{ memberId: 'M1', name: 'Jean', wins: 3, points: 39 }],
            },
            { selector: selectTrainingClubLeaderboardIsLoading, value: false },
            { selector: selectTrainingClubLeaderboardError, value: null },
          ],
        }),
      ],
    });
    const fixture = TestBed.createComponent(ClubLeaderboardPopup);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Classement du club');
    expect(element.textContent).toContain('Jean');

    element.querySelector<HTMLElement>('.popup-close')!.click();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
