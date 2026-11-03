import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { championshipStartBlocker } from './championship-start.util';

function championship(clubs: string[]): TournamentDto {
  return {
    configuration: {
      competitionMode: 'championship',
      competitionConfiguration: { homeClub: 'Home', awayClub: 'Away' },
    },
    teams: clubs.map((club, index) => ({ id: `t${index}`, name: `T${index}`, club, players: [] })),
  } as unknown as TournamentDto;
}

const clubs = (home: number, away: number) => [
  ...Array<string>(home).fill('Home'),
  ...Array<string>(away).fill('Away'),
];

describe('championshipStartBlocker', () => {
  it('lets a 4 against 4 championship start', () => {
    expect(championshipStartBlocker(championship(clubs(4, 4)))).toBeNull();
  });

  it('explains an uneven split', () => {
    expect(championshipStartBlocker(championship(clubs(3, 5)))).toContain(
      '3 équipe(s) pour Home, 5 pour Away',
    );
  });

  it('counts the teams that belong to neither club', () => {
    expect(championshipStartBlocker(championship([...clubs(4, 3), 'Other']))).toContain(
      '1 sans club du championnat',
    );
  });

  it('never blocks another mode', () => {
    const tournament = { configuration: { competitionMode: 'standard' }, teams: [] };
    expect(championshipStartBlocker(tournament as unknown as TournamentDto)).toBeNull();
  });
});
