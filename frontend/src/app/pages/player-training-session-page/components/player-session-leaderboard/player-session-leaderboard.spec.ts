import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PlayerSessionLeaderboard } from './player-session-leaderboard';

describe('PlayerSessionLeaderboard', () => {
  it('propose le classement du club au joueur', () => {
    const fixture = TestBed.createComponent(PlayerSessionLeaderboard);
    fixture.detectChanges();
    const opened = vi.fn();
    fixture.componentInstance.openClubLeaderboard.subscribe(opened);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.club-button .button')!
      .click();

    expect(opened).toHaveBeenCalled();
  });
});
