import { Tournament } from 'src/entities/tournament.entity';
import { TournamentConfigurationDto } from '../dto/tournament-configuration.dto';
import {
    StructuredCompetitionConfiguration,
    TournamentCompetitionConfiguration,
    UpDownCompetitionConfiguration,
} from 'src/entities/tournament-competition-configuration.entity';
import { CompetitionMode } from 'src/enum/tounament.enum';

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
            };
        }
        default:
            return {};
    }
}
