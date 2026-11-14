import { TounamentTeamDto } from 'src/app/store/tournament/tournament.models';
import { findCreatedTeam, findNewTeam } from './team-config.utils';

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

describe('findCreatedTeam', () => {
  const previous = new Set(['a']);

  it('matches the new team by its trimmed submitted name', () => {
    const teams = [team('a'), team('x', 'Other'), team('b', 'Bravo')];
    expect(findCreatedTeam(previous, teams, '  Bravo ')?.id).toBe('b');
  });

  it('ignores a team with the same name that already existed', () => {
    expect(findCreatedTeam(new Set(['a']), [team('a', 'Bravo')], 'Bravo')).toBeNull();
  });

  it('returns null when the submitted name is absent from the new teams', () => {
    expect(findCreatedTeam(previous, [team('a'), team('x', 'Other')], 'Bravo')).toBeNull();
  });

  it('predicts the backend auto-name when no name was submitted', () => {
    const teams = [team('a'), team('x', 'Other'), team('b', 'Équipe 2')];
    expect(findCreatedTeam(previous, teams, undefined)?.id).toBe('b');
  });

  it('falls back to the single new team when no name was submitted', () => {
    expect(findCreatedTeam(previous, [team('a'), team('b', 'Renamed')], '')?.id).toBe('b');
  });

  it('returns null without a name when several unmatched teams appeared', () => {
    expect(findCreatedTeam(previous, [team('a'), team('b'), team('c')], undefined)).toBeNull();
  });
});
