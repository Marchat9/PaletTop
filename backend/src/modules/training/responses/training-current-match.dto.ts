import { TrainingMatchDto } from './training-round.dto';

/**
 * Identity of the participant calling the API. Only returned to the one who gave their own code:
 * without it the client cannot tell which of the two sides of the match is theirs, nor find itself
 * in the leaderboard (no public payload carries the codes).
 */
export interface TrainingParticipantIdentityDto {
    id: string;
    name: string;
}

export interface TrainingCurrentMatchDto {
    participant: TrainingParticipantIdentityDto;
    match: TrainingMatchDto | null;
    // Number of the current round, even when the participant does not play in it - enough to place
    // the rest.
    roundNumber: number | null;
    sitOut: boolean; // true = the current round exists but this participant rests this round.
}
