import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateTrainingMatchDto {
    @IsString()
    @IsNotEmpty()
    participantCode!: string;

    // Code de n'importe quel participant de l'équipe adverse — rôle équivalent à
    // `opponentTeamCode` en tournoi, mais à granularité individuelle (pas de code d'équipe ici).
    @IsString()
    @IsNotEmpty()
    opponentParticipantCode!: string;
}
