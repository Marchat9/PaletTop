import { NotImplementedException } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchesSessionStatus, TournamentStatus } from 'src/enum/status.enum';
import { TournamentStatusInfo } from '../../../tournaments/responses/tournament-status.dto';
import { TournamentStrategy } from '../tournament-strategy.abstract';

export class UpDownTournamentStrategy extends TournamentStrategy {
    override async generateSessionMatches(
        _tournament: Tournament,
        _session: MatchesSession,
        _pastMatches: TournamentMatch[],
    ): Promise<TournamentMatch[]> {
        // TODO: Logique montante-descendante (up-down / progressive)
        //
        // Principe :
        // - Session 1 : tirage aléatoire parmi toutes les équipes (pas de poules)
        // - Sessions suivantes : appariement par niveau selon classement courant
        //   → équipe 1 vs équipe 2, équipe 3 vs équipe 4, etc.
        //   → permet un affinage progressif du classement réel
        //
        // Différences avec STANDARD :
        // - Pas de poules (pool = null sur les matchs)
        // - assignTeamsToPools() n'est pas appelé (pas de pools)
        // - Le bye est possible (équipe exemptée si nombre impair)
        //
        // Inputs :
        // - tournament.configuration.numberOfPlaques → nombre de matchs simultanés
        // - pastMatches → classement courant pour l'appariement
        //
        // Output : liste de TournamentMatch[] à persister
        throw new NotImplementedException('UpDown non encore implémenté');
    }

    override async assignTeamsToPools(_tournament: Tournament): Promise<TournamentPool[]> {
        // Pas de poules dans ce mode / 1 seule pool avec tout le monde.
        throw new NotImplementedException('UpDown non encore implémenté');
    }

    override computeTournamentStatus(
        tournament: Tournament,
        sessions: MatchesSession[],
    ): TournamentStatusInfo {
        const closed = sessions.filter((s) => s.status === MatchesSessionStatus.CLOSED);
        return {
            currentSession: this.currentSessionNumber(sessions),
            phaseName: 'Montée / Descente',
            canFinishTournament:
                tournament.status === TournamentStatus.ACTIVE && closed.length >= 1,
            canGenerateNewSession:
                tournament.status === TournamentStatus.ACTIVE && this.allMatchesValidated(sessions),
        };
    }
}
