import { NotImplementedException } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatusInfo } from '../../../tournaments/responses/tournament-status.dto';
import { TournamentStrategy } from '../tournament-strategy.abstract';

export class ChampionshipTournamentStrategy extends TournamentStrategy {
    override async assignTeamsToPools(_tournament: Tournament): Promise<TournamentPool[]> {
        // TODO: Attribution fixe hôte/visiteur
        //
        // Principe :
        // - 4 équipes "hôtes" (home) fixes par planche (pool), toujours à la même planche
        // - 4 équipes "visiteurs" (away) qui tournent de planche en planche à chaque session
        // - L'attribution des équipes aux pools est faite une fois pour toutes au démarrage
        //
        // Structure suggérée :
        // - Pool = planche physique (fixe sur toute la durée)
        // - Chaque pool a 4 hôtes (Team.isHome = true ?) et reçoit 4 visiteurs par session
        // - La rotation des visiteurs suit un planning calculé à l'avance (round-robin entre visiteurs)
        //
        // À concevoir :
        // - Comment stocker le rôle hôte/visiteur sur l'équipe ou le pool ?
        // - Comment calculer la rotation ? (ex : déplacement circulaire d'index)
        throw new NotImplementedException(
            'Championship — assignTeamsToPools non encore implémenté',
        );
    }

    override async generateSessionMatches(
        _tournament: Tournament,
        _session: MatchesSession,
        _pastMatches: TournamentMatch[],
    ): Promise<TournamentMatch[]> {
        // TODO: Génération des matchs selon la rotation hôte/visiteur
        //
        // Principe :
        // - Pour chaque pool (planche) : les 4 hôtes jouent contre les 4 visiteurs du tour
        // - Les paires hôte/visiteur au sein d'un pool sont déterminées par la configuration
        //   (ex : hôte 1 vs visiteur A, hôte 2 vs visiteur B, …)
        // - Pas de bye car le nombre d'équipes est toujours pair (4 hôtes × n pools + 4 visiteurs × n pools)
        //
        // Inputs :
        // - tournament.configuration.eliminationTableaux → peut contenir la configuration des planches
        // - pastMatches → pour calculer quelle rotation de visiteurs est en cours
        //
        // Output : liste de TournamentMatch[] à persister
        throw new NotImplementedException(
            'Championship — generateSessionMatches non encore implémenté',
        );
    }

    override computeTournamentStatus(
        _tournament: Tournament,
        _sessions: MatchesSession[],
    ): TournamentStatusInfo {
        throw new NotImplementedException(
            'Championship — computeTournamentStatus non encore implémenté',
        );
    }

    override computeRawScoreToPoints(_score: number): number {
        // TODO: Calcul de points par paliers de score
        //
        // Principe : le score brut (nombre de palets) est converti en points selon une grille
        // Exemple de grille possible :
        //   0–4  palets → 0 pt
        //   5–9  palets → 1 pt
        //   10–14 palets → 2 pts
        //   15+  palets → 3 pts
        //
        // La grille exacte est à définir avec l'organisateur.
        // La configuration pourrait être stockée dans tournament.configuration (champ à ajouter).
        throw new NotImplementedException(
            'Championship — computeRawScoreToPoints non encore implémenté',
        );
    }
}
