import { TrainingRound } from 'src/entities/training-round.entity';
import { MatchStatus } from 'src/enum/status.enum';

/** A round is finished once all its matches are validated - a bye needs no validation. */
export function hasUnfinishedMatch(round: TrainingRound): boolean {
    return round.matches.some((match) => !match.isBye && match.status !== MatchStatus.VALIDATED);
}
