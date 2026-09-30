import { plainToInstance, Type } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    validateSync,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { CompetitionMode } from 'src/enum/tounament.enum';

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

    // Only checked here; an out-of-range value falls back to the automatic size at tournament start.
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    principalBracketSize?: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    numberOfQualifyingRounds!: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    numberOfPools?: number;
}

export class UpDownTournamentConfig extends SpecificTournamentConfig {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    numberOfRound?: number;
}

export class ChampionshipTournamentConfig extends SpecificTournamentConfig {
    @IsString()
    @IsNotEmpty()
    homeClub!: string;

    @IsString()
    @IsNotEmpty()
    awayClub!: string;
}

const CONFIG_CLASS_BY_MODE: Record<CompetitionMode, new () => SpecificTournamentConfig> = {
    [CompetitionMode.STANDARD]: StructuredTournamentConfig,
    [CompetitionMode.UP_DOWN]: UpDownTournamentConfig,
    [CompetitionMode.CHAMPIONSHIP]: ChampionshipTournamentConfig,
};

/**
 * Validates `competitionConfiguration` against the class matching the sibling `competitionMode`.
 * A per-mode discriminator can't live on class-transformer's `@Type` here because the mode is a
 * sibling field, not a property of the nested object - so this reads it from the parent and runs
 * the right config DTO's own rules.
 */
@ValidatorConstraint({ name: 'competitionConfiguration', async: false })
export class CompetitionConfigConstraint implements ValidatorConstraintInterface {
    private message = 'Configuration de compétition invalide.';

    validate(value: unknown, args: ValidationArguments): boolean {
        const mode = (args.object as { competitionMode?: CompetitionMode }).competitionMode;
        const configClass = mode ? CONFIG_CLASS_BY_MODE[mode] : undefined;
        if (!configClass) {
            this.message = 'Mode de compétition inconnu.';
            return false;
        }
        if (typeof value !== 'object' || value === null) {
            this.message = 'La configuration de compétition est requise.';
            return false;
        }

        const errors = validateSync(plainToInstance(configClass, value), {
            whitelist: true,
            forbidNonWhitelisted: true,
        });
        if (errors.length > 0) {
            this.message = errors
                .flatMap((error) => Object.values(error.constraints ?? {}))
                .join(' ; ');
            return false;
        }
        return true;
    }

    defaultMessage(): string {
        return this.message;
    }
}
