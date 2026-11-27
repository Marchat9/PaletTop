import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LiveMatchView } from 'src/app/models/live-match.model';
import { LiveMatchBoard } from './live-match-board';

function match(id: string, status: string, patch: Partial<LiveMatchView> = {}): LiveMatchView {
  return {
    id,
    status,
    isBye: false,
    plateNumber: 1,
    groupLabel: null,
    teamA: 'A',
    teamB: 'B',
    scoreA: 0,
    scoreB: 0,
    startedAt: status === 'PENDING' ? null : '2026-11-27T10:00:00.000Z',
    finishedAt: status === 'ONGOING' || status === 'PENDING' ? null : '2026-11-27T10:12:30.000Z',
    ...patch,
  };
}

function render(matches: LiveMatchView[]): HTMLElement[] {
  TestBed.configureTestingModule({ imports: [LiveMatchBoard] });
  const fixture = TestBed.createComponent(LiveMatchBoard);
  fixture.componentRef.setInput('matches', matches);
  fixture.detectChanges();
  return Array.from(fixture.nativeElement.querySelectorAll('.tile'));
}

describe('LiveMatchBoard', () => {
  it('shows the timer before the status once the match has started', () => {
    const tiles = render([match('m1', 'ONGOING'), match('m2', 'ENDED'), match('m3', 'VALIDATED')]);

    for (const tile of tiles) {
      const status = tile.querySelector('.status');
      expect(status?.firstElementChild?.tagName.toLowerCase()).toBe('app-match-timer');
    }
    expect(tiles[2].querySelector('app-match-timer')?.textContent).toContain('12:30');
  });

  it('shows no timer before the match starts, nor for a bye', () => {
    const tiles = render([
      match('m1', 'PENDING'),
      match('m2', 'VALIDATED', { isBye: true, teamB: null }),
    ]);

    expect(tiles[0].querySelector('app-match-timer')).toBeNull();
    expect(tiles[1].querySelector('app-match-timer')).toBeNull();
  });
});
