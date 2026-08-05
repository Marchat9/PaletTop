import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export abstract class SpecificTournamentConfig {}

export class StructuredTournamentConfig extends SpecificTournamentConfig {
    @IsBoolean()
    hasConsolanteTable!: boolean;

    @IsBoolean()
    hasChallengePrincipaleTable!: boolean;

    @IsBoolean()
    hasChallengeConsolanteTable!: boolean;

    @IsBoolean()
    hasThirdPlaceMatch!: boolean;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    principalBracketSize?: number;

    @Type(() => Number)
    @IsInt()
    numberOfQualifyingRounds!: number;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    numberOfPools?: number;
}

export class UpDownTournamentConfig extends SpecificTournamentConfig {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    numberOfRound?: number;
}
