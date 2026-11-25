import { describe, expect, it } from 'vitest';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  buildLaunchPlanBody,
  hasLowFill,
  isPlanPossible,
  isSummaryLaunch,
  launchChoiceOfConfiguration,
  launchChoiceOfOption,
  worstFillLevel,
} from './launch-check.util';
import {
  exactCountPlan,
  fewerTeamsPlan,
  impossiblePlan,
  LOW_FILL_WARNING,
  planBracket,
  launchPlanOf,
} from './launch-plan.fixtures';

function tournament(competitionMode: string, teamCount: number): TournamentDto {
  return {
    configuration: {
      maxTeamCapacity: 128,
      competitionMode,
      competitionConfiguration: { consolationCount: 2, numberOfQualifyingRounds: 4 },
    },
    teams: Array.from({ length: teamCount }, (_, index) => ({ id: `t${index}` })),
  } as unknown as TournamentDto;
}

describe('launch check utils', () => {
  describe('buildLaunchPlanBody', () => {
    it('previews the saved configuration with the registered teams', () => {
      expect(buildLaunchPlanBody(tournament('standard', 117))).toEqual({
        competitionMode: 'standard',
        competitionConfiguration: { consolationCount: 2, numberOfQualifyingRounds: 4 },
        teamCount: 117,
        targetCount: 128,
      });
    });

    it('has nothing to preview for a mode without a plan', () => {
      expect(buildLaunchPlanBody(tournament('up_down', 20))).toBeNull();
    });
  });

  describe('launch choices', () => {
    it('carries the values of the option and the checked count', () => {
      const [, , stopLast] = fewerTeamsPlan().options;

      expect(launchChoiceOfOption(stopLast, 117)).toEqual({
        expectedTeamCount: 117,
        consolationCount: 2,
        eliminatedAfterQualifying: 5,
      });
    });

    it('keeps the saved configuration for the planned count', () => {
      expect(launchChoiceOfConfiguration(tournament('standard', 128), 128)).toEqual({
        expectedTeamCount: 128,
        consolationCount: 2,
        eliminatedAfterQualifying: 0,
      });
    });
  });

  describe('summary or options', () => {
    it('only needs the summary when the server just offers to keep the configuration', () => {
      expect(isSummaryLaunch(exactCountPlan())).toBe(true);
      expect(isSummaryLaunch({ ...exactCountPlan(), options: [] })).toBe(true);
      expect(isSummaryLaunch(fewerTeamsPlan())).toBe(false);
    });

    it('sends an impossible plan to the options, which say so', () => {
      expect(isPlanPossible(impossiblePlan())).toBe(false);
      expect(isPlanPossible(exactCountPlan())).toBe(true);
      expect(isSummaryLaunch(impossiblePlan())).toBe(false);
    });
  });

  describe('fill', () => {
    it('spots a nearly empty bracket from the warnings', () => {
      expect(hasLowFill({ warnings: [LOW_FILL_WARNING] })).toBe(true);
      expect(hasLowFill({ warnings: [] })).toBe(false);
    });

    it('takes the worst level of the brackets', () => {
      const plan = (...levels: ('ok' | 'mid' | 'low')[]) =>
        launchPlanOf(
          100,
          levels.map((level, index) => planBracket(`b${index}`, `B${index}`, 32, 30, level)),
        );

      expect(worstFillLevel(plan('ok', 'ok'))).toBe('ok');
      expect(worstFillLevel(plan('ok', 'mid'))).toBe('mid');
      expect(worstFillLevel(plan('mid', 'low', 'ok'))).toBe('low');
    });
  });
});
