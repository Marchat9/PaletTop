import { describe, expect, it } from 'vitest';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  hasSoftTeamTarget,
  registeredTeamsLabel,
  registrationCapacity,
} from './team-capacity.util';

function tournament(
  competitionMode: string,
  teamCount: number,
  maxTeamCapacity: number | null = 16,
): TournamentDto {
  return {
    configuration: { competitionMode, maxTeamCapacity: maxTeamCapacity ?? undefined },
    teams: Array.from({ length: teamCount }, (_, index) => ({ id: `t${index}` })),
  } as unknown as TournamentDto;
}

describe('team capacity utils', () => {
  it('only treats the capacity of the structured mode as a target', () => {
    expect(hasSoftTeamTarget(tournament('standard', 0))).toBe(true);
    expect(hasSoftTeamTarget(tournament('up_down', 0))).toBe(false);
    expect(hasSoftTeamTarget(tournament('championship', 0))).toBe(false);
  });

  it('accepts teams above the target of a structured tournament, up to the absolute maximum', () => {
    expect(registrationCapacity(tournament('standard', 0, 16))).toBe(256);
  });

  it('stops at the capacity of the other modes, the absolute maximum without one', () => {
    expect(registrationCapacity(tournament('up_down', 0, 16))).toBe(16);
    expect(registrationCapacity(tournament('championship', 0, 8))).toBe(8);
    expect(registrationCapacity(tournament('up_down', 0, null))).toBe(256);
    expect(registrationCapacity(null)).toBe(256);
  });

  it('shows the target of a structured tournament, the limit of the others', () => {
    expect(registeredTeamsLabel(tournament('standard', 20, 16))).toBe('20 équipes (cible 16)');
    expect(registeredTeamsLabel(tournament('standard', 1, 16))).toBe('1 équipe (cible 16)');
    expect(registeredTeamsLabel(tournament('up_down', 12, 16))).toBe('12 / 16 équipes');
  });
});
