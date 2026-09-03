import { TrainingRound } from 'src/entities/training-round.entity';
import { TrainingMatch } from 'src/entities/training-match.entity';
import { TrainingRoundStatus } from 'src/enum/training.enum';
import { MatchStatus } from 'src/enum/status.enum';
import { TrainingTeamDto, toTrainingTeamDto } from './training-session.dto';

export interface TrainingMatchDto {
    id: string;
    status: MatchStatus;
    teamA: TrainingTeamDto;
    teamB: TrainingTeamDto | null;
    isBye: boolean;
    scoreA: number;
    scoreB: number;
    startedAt?: string;
    finishedAt?: string;
}

export interface TrainingRoundDto {
    id: string;
    roundNumber: number;
    status: TrainingRoundStatus;
    matches: TrainingMatchDto[];
}

export function toTrainingMatchDto(match: TrainingMatch): TrainingMatchDto {
    return {
        id: match.id,
        status: match.status,
        teamA: toTrainingTeamDto(match.teamA),
        teamB: match.teamB ? toTrainingTeamDto(match.teamB) : null,
        isBye: match.isBye,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        startedAt: match.startedAt?.toISOString(),
        finishedAt: match.finishedAt?.toISOString(),
    };
}

export function toTrainingRoundDto(round: TrainingRound): TrainingRoundDto {
    return {
        id: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        matches: (round.matches ?? []).map(toTrainingMatchDto),
    };
}
