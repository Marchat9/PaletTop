import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ValidateTrainingMatchDto {
    @IsString()
    @IsNotEmpty()
    participantCode!: string;

    // Code of any participant of the opposing team - same role as `opponentTeamCode` in a
    // tournament, but per player (there is no team code here).
    @IsString()
    @IsNotEmpty()
    opponentParticipantCode!: string;

    // Score the player saw when validating: refused if it changed since (stale realtime).
    // Optional, for the clients sent before this check existed.
    @IsOptional()
    @IsInt()
    @Min(0)
    previousScoreA?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    previousScoreB?: number;
}
