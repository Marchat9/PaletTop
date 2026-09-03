import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateTrainingSessionDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @Type(() => Date)
    @IsDate()
    date!: Date;

    @IsInt()
    @Min(1)
    playersPerTeam!: number;

    @IsInt()
    @Min(1)
    fallbackTeamSize!: number;

    @IsBoolean()
    allowSitOut!: boolean;

    @IsBoolean()
    avoidSamePartnerConsecutive!: boolean;

    @IsBoolean()
    avoidSameOpponentConsecutive!: boolean;

    @IsInt()
    @Min(1)
    pointsPerGame!: number;
}
