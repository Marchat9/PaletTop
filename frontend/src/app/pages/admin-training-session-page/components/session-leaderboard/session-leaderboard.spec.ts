import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { SessionLeaderboard } from './session-leaderboard';

function setup(canOpenClubLeaderboard: boolean) {
  const fixture = TestBed.createComponent(SessionLeaderboard);
  fixture.componentRef.setInput('canOpenClubLeaderboard', canOpenClubLeaderboard);
  fixture.detectChanges();
  return fixture;
}

describe('SessionLeaderboard', () => {
  it('propose le classement du club à l’admin', () => {
    const fixture = setup(true);
    const opened = vi.fn();
    fixture.componentInstance.openClubLeaderboard.subscribe(opened);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.club-button .button')!
      .click();

    expect(opened).toHaveBeenCalled();
  });

  it('ne le propose pas ailleurs (page spectateur)', () => {
    const fixture = setup(false);

    expect((fixture.nativeElement as HTMLElement).querySelector('.club-button')).toBeNull();
  });
});
