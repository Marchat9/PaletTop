import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentConfigurationDto } from '../dto/tournament-configuration.dto';
import {
    ChampionShipCompetitionConfiguration,
    StructuredCompetitionConfiguration,
    TournamentCompetitionConfiguration,
    UpDownCompetitionConfiguration,
} from 'src/entities/tournament-competition-configuration.entity';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { TournamentConfiguration } from 'src/entities/tournament-configuration.entity';
import { ConstraintConfig } from 'src/model/constraint.model';

interface TeamWithMatches extends Team {
    matches?: TournamentMatch[] | null;
}

/**
 * Strips the team codes from every match of a tournament sent to a player. A match's teams are
 * full entities, opponent included, and the opponent's code is the proof asked at validation.
 */
export function stripMatchTeamCodes(tournament: Tournament): Tournament {
    const matches = [
        ...(tournament.matches ?? []),
        ...(tournament.matchsSessions ?? []).flatMap((session) => session.matches ?? []),
        // The player's own team is sent with its matches attached (see the join endpoint).
        ...(tournament.teams ?? []).flatMap((team) => (team as TeamWithMatches).matches ?? []),
    ];
    for (const match of matches) {
        if (match.teamA) Reflect.deleteProperty(match.teamA, 'code');
        if (match.teamB) Reflect.deleteProperty(match.teamB, 'code');
    }
    return tournament;
}

export function sanitizeTournament(tournament: Tournament): Tournament {
    const safeTournament = tournament as Tournament & { adminPassword?: string };
    Reflect.deleteProperty(safeTournament, 'adminPassword');

    for (const team of safeTournament.teams ?? []) {
        Reflect.deleteProperty(team, 'tournament');
        for (const player of team.players ?? []) {
            Reflect.deleteProperty(player, 'tournament');
            Reflect.deleteProperty(player, 'team');
        }
    }

    for (const match of safeTournament.matches ?? []) {
        Reflect.deleteProperty(match, 'tournament');
        if (match.teamA) Reflect.deleteProperty(match.teamA, 'tournament');
        if (match.teamB) Reflect.deleteProperty(match.teamB, 'tournament');
    }

    for (const session of safeTournament.matchsSessions ?? []) {
        Reflect.deleteProperty(session, 'tournament');
        for (const match of session.matches ?? []) {
            Reflect.deleteProperty(match, 'tournament');
            if (match.teamA) Reflect.deleteProperty(match.teamA, 'tournament');
            if (match.teamB) Reflect.deleteProperty(match.teamB, 'tournament');
        }
    }

    return safeTournament;
}

export function extractCompetitionConfiguration(
    config: TournamentConfigurationDto,
): TournamentCompetitionConfiguration {
    switch (config.competitionMode) {
        case CompetitionMode.STANDARD: {
            const structuredConfig =
                config.competitionConfiguration as StructuredCompetitionConfiguration;
            return {
                hasConsolanteTable: structuredConfig.hasConsolanteTable,
                hasChallengePrincipaleTable: structuredConfig.hasChallengePrincipaleTable,
                hasChallengeConsolanteTable: structuredConfig.hasChallengeConsolanteTable,
                hasThirdPlaceMatch: structuredConfig.hasThirdPlaceMatch,
                principalBracketSize: structuredConfig.principalBracketSize,
                numberOfQualifyingRounds: structuredConfig.numberOfQualifyingRounds,
                numberOfPools: structuredConfig.numberOfPools,
            };
        }
        case CompetitionMode.UP_DOWN: {
            const upDownConfig = config.competitionConfiguration as UpDownCompetitionConfiguration;
            return {
                numberOfRound: upDownConfig.numberOfRound,
                lastRoundByRanking: upDownConfig.lastRoundByRanking ?? false,
            };
        }
        case CompetitionMode.CHAMPIONSHIP: {
            const championshipConfig =
                config.competitionConfiguration as ChampionShipCompetitionConfiguration;
            return {
                homeClub: championshipConfig.homeClub,
                awayClub: championshipConfig.awayClub,
            };
        }
        default:
            return {};
    }
}

export function extractContraintConfig(configuration: TournamentConfiguration): ConstraintConfig {
    return {
        allowRematch: configuration.rematch ?? false,
        allowMatchAgainstFullSameClub: configuration.matchAgainstFullSameClub ?? false,
        allowMatchAgainstPartialSameClub: configuration.matchAgainstPartialSameClub ?? false,
    };
}
