import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ConstraintConfig } from 'src/model/constraint.model';
import { selectByeTeam } from '../../utils/bye.utils';
import { TeamPair } from '../../utils/draw.utils';
import {
    buildDutchLevels,
    byDistance,
    PairingResult,
    pairAtFirstPossibleLevel,
    Preferences,
} from './dutch-pairing.utils';

/**
 * Ranking neighbours: 1st against 2nd, 3rd against 4th… `rankedTeams` is an even number of teams,
 * best first. The tournament's constraints (rematch, same club) are kept as far as possible: the
 * search starts with the best ranked team and gives it the closest opponent in the ranking that
 * the constraints allow, so the top of the ranking is the last to be bent. The levels are the
 * tournament settings first, then relaxed; the last one has no constraint and is the pure
 * neighbours, so a full pairing always comes out.
 */
export function pairNeighbors(
    rankedTeams: Team[],
    pastMatches: TournamentMatch[],
    config: ConstraintConfig,
): TeamPair[] {
    if (rankedTeams.length < 2) return [];
    const preferences: Preferences = new Map(
        rankedTeams.map((team, index) => [team.id, byDistance(rankedTeams, index)]),
    );
    return pairAtFirstPossibleLevel(
        rankedTeams,
        preferences,
        buildDutchLevels(config),
        pastMatches,
    );
}

/**
 * A neighbour round: the bye (odd number of teams) goes to a team among those with the fewest
 * byes, drawn with `random`, before the others are paired.
 */
export function buildNeighborRound(
    rankedTeams: Team[],
    pastMatches: TournamentMatch[],
    config: ConstraintConfig,
    random: () => number,
): PairingResult {
    const byeTeam =
        rankedTeams.length % 2 !== 0
            ? selectByeTeam(rankedTeams, pastMatches, undefined, random)
            : null;
    const playing = rankedTeams.filter((team) => team.id !== byeTeam?.id);
    return { pairs: pairNeighbors(playing, pastMatches, config), byeTeam };
}
