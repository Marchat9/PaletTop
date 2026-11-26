import { plainToInstance, Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    Validate,
    validateSync,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { CompetitionMode, EliminationSeeding, PairingMode } from 'src/enum/tounament.enum';

export abstract class SpecificTournamentConfig {}

/**
 * `eliminatedAfterQualifying` and `plan` are written by the backend at launch: they are not part
 * of this class and are dropped from the request (see `SERVER_WRITTEN_FIELDS`). The upper bound of
 * `consolationCount` is an app setting, checked by the service.
 */
export class StructuredTournamentConfig extends SpecificTournamentConfig {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    numberOfQualifyingRounds!: number;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    consolationCount!: number;

    @IsBoolean()
    hasChallenges!: boolean;

    @IsBoolean()
    hasThirdPlaceMatch!: boolean;

    @IsEnum(EliminationSeeding)
    @IsOptional()
    eliminationSeeding?: EliminationSeeding;
}

@ValidatorConstraint({ name: 'lastRoundByRanking', async: false })
class LastRoundByRankingConstraint implements ValidatorConstraintInterface {
    validate(value: unknown, args: ValidationArguments): boolean {
        if (value !== true) return true;
        const { numberOfRound } = args.object as UpDownTournamentConfig;
        return typeof numberOfRound === 'number' && numberOfRound >= 2;
    }

    defaultMessage(): string {
        return 'La dernière partie au classement nécessite au moins 2 parties.';
    }
}

export class UpDownTournamentConfig extends SpecificTournamentConfig {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    numberOfRound?: number;

    // The ranking-based last round only makes sense after at least one drawn round.
    @IsBoolean()
    @IsOptional()
    @Validate(LastRoundByRankingConstraint)
    lastRoundByRanking?: boolean;

    @IsEnum(PairingMode)
    @IsOptional()
    pairingMode?: PairingMode;
}

@ValidatorConstraint({ name: 'differentFromHomeClub', async: false })
class DifferentFromHomeClubConstraint implements ValidatorConstraintInterface {
    validate(value: unknown, args: ValidationArguments): boolean {
        const { homeClub } = args.object as ChampionshipTournamentConfig;
        if (typeof value !== 'string' || typeof homeClub !== 'string') return true;
        return value.trim().toLowerCase() !== homeClub.trim().toLowerCase();
    }

    defaultMessage(): string {
        return "Le club à domicile et le club à l'extérieur doivent être différents.";
    }
}

export class ChampionshipTournamentConfig extends SpecificTournamentConfig {
    @IsString()
    @IsNotEmpty()
    homeClub!: string;

    // Same club on both sides: teams could only pick that club and the start always failed.
    @IsString()
    @IsNotEmpty()
    @Validate(DifferentFromHomeClubConstraint)
    awayClub!: string;
}

/** Fields of a stored configuration written by the backend only: ignored when sent by a client. */
const SERVER_WRITTEN_FIELDS: Record<CompetitionMode, readonly string[]> = {
    [CompetitionMode.STANDARD]: ['eliminatedAfterQualifying', 'plan'],
    [CompetitionMode.UP_DOWN]: [],
    [CompetitionMode.CHAMPIONSHIP]: [],
};

/** The request's configuration without the fields the backend writes itself. */
function withoutServerWrittenFields(mode: CompetitionMode, value: object): object {
    const ignored = SERVER_WRITTEN_FIELDS[mode];
    return Object.fromEntries(Object.entries(value).filter(([key]) => !ignored.includes(key)));
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
        if (!mode || !configClass) {
            this.message = 'Mode de compétition inconnu.';
            return false;
        }
        if (typeof value !== 'object' || value === null) {
            this.message = 'La configuration de compétition est requise.';
            return false;
        }

        const input = withoutServerWrittenFields(mode, value);
        const errors = validateSync(plainToInstance(configClass, input), {
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
