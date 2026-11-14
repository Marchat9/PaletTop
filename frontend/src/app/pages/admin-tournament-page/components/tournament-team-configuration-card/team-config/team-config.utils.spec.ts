import { TounamentTeamDto } from 'src/app/store/tournament/tournament.models';
import { findNewTeam } from './team-config.utils';

function team(id: string, name = id, code?: string): TounamentTeamDto {
  return { id, name, code, players: [] };
}

describe('findNewTeam', () => {
  it('findNewTeam returns the team absent from previous ids', () => {
    const teams = [team('a'), team('b', 'Bravo', '1234'), team('c')];
    const previous = new Set(['a', 'c']);
    expect(findNewTeam(previous, teams)).toEqual(team('b', 'Bravo', '1234'));
  });

  it('returns null when every team was already known', () => {
    expect(findNewTeam(new Set(['a']), [team('a')])).toBeNull();
  });

  it('returns null for an empty team list', () => {
    expect(findNewTeam(new Set(), [])).toBeNull();
  });
});
