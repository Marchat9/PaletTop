import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MatchesSessionDto, SessionStatus } from 'src/app/models/matches-session.model';
import { SpectatorMatchListComponent } from './spectator-match-list';

const SESSION: MatchesSessionDto = {
  id: 'session-1',
  sessionNumber: 2,
  status: SessionStatus.OPEN,
  matches: [
    {
      id: 'match-1',
      status: 'ONGOING',
      isBye: false,
      scoreA: 4,
      scoreB: 2,
      plateNumber: 5,
      teamA: { id: 'team-a', name: 'Équipe A' },
      teamB: { id: 'team-b', name: 'Équipe B' },
      poolNumber: 1,
      group: null,
      startedAt: '2026-08-11T10:00:00.000Z',
      finishedAt: null,
      duration: null,
    },
  ],
};

function setup(session: MatchesSessionDto | null = SESSION) {
  TestBed.configureTestingModule({ imports: [SpectatorMatchListComponent] });
  const fixture = TestBed.createComponent(SpectatorMatchListComponent);
  fixture.componentRef.setInput('session', session);
  fixture.detectChanges();
  return { fixture };
}

describe('SpectatorMatchListComponent', () => {
  it('renders the match plate number, teams and score', () => {
    const { fixture } = setup();
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('5');
    expect(text).toContain('Équipe A');
    expect(text).toContain('Équipe B');
    expect(text).toContain('4');
    expect(text).toContain('2');
  });

  it('renders no edit affordance', () => {
    const { fixture } = setup();

    expect(fixture.nativeElement.querySelector('.edit-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('button:not(.close-button)')).toBeNull();
  });

  it('renders nothing when there is no session', () => {
    const { fixture } = setup(null);

    expect(fixture.nativeElement.querySelector('.match-row')).toBeNull();
  });
});
