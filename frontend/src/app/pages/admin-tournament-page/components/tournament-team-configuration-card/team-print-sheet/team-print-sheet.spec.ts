import { TestBed } from '@angular/core/testing';
import { TeamPrintSheet } from './team-print-sheet';
import { TounamentTeamDto, TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';

function buildTournament(teams: TounamentTeamDto[]): TournamentDto {
  return {
    id: 't1',
    code: 'ABCD',
    name: 'Tournoi Test',
    date: new Date(),
    configuration: {
      maxTeamCapacity: 16,
      scoreCalculation: 'victory_ga',
      pointsPerGame: 1,
      rematch: false,
      matchAgainstFullSameClub: false,
      matchAgainstPartialSameClub: false,
      competitionMode: 'standard',
      competitionConfiguration: {},
    },
    status: TournamentStatus.DRAFT,
    teams,
    createdAt: new Date().toISOString(),
    tournamentStatus: null,
  };
}

describe('TeamPrintSheet', () => {
  it('sorts teams alphabetically and joins player names', () => {
    const fixture = TestBed.createComponent(TeamPrintSheet);
    fixture.componentRef.setInput(
      'tournament',
      buildTournament([
        {
          id: 'team-2',
          code: '4242',
          name: 'Zebra',
          players: [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' },
          ],
        },
        {
          id: 'team-1',
          code: '1234',
          name: 'Alpha',
          players: [{ id: 'p3', name: 'Chloé' }],
        },
      ]),
    );
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Alpha');
    expect(rows[0].textContent).toContain('1234');
    expect(rows[0].textContent).toContain('Chloé');
    expect(rows[1].textContent).toContain('Zebra');
    expect(rows[1].textContent).toContain('Alice, Bob');
  });

  it('renders the tournament name and code as distinct elements', () => {
    const fixture = TestBed.createComponent(TeamPrintSheet);
    fixture.componentRef.setInput('tournament', buildTournament([]));
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('.print-title');
    const code = fixture.nativeElement.querySelector('.print-tournament-code .code-value');
    expect(title.textContent).toContain('Tournoi Test');
    expect(code.textContent).toContain('ABCD');
    expect(title).not.toBe(code);
  });

  it('renders no rows when the tournament has no teams', () => {
    const fixture = TestBed.createComponent(TeamPrintSheet);
    fixture.componentRef.setInput('tournament', buildTournament([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(0);
  });
});
