import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateTrainingMatchDto {
    @IsString()
    @IsNotEmpty()
    participantCode!: string;

    // Code of any participant of the opposing team - same role as `opponentTeamCode` in a
    // tournament, but per player (there is no team code here).
    @IsString()
    @IsNotEmpty()
    opponentParticipantCode!: string;
}
