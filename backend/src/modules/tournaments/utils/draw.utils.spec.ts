import { describe, expect, it } from 'vitest';
import { Player } from 'src/entities/player.entity';
import { PlayerClub } from 'src/entities/player_club.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ConstraintConfig } from 'src/model/constraint.model';
import { generatePairsWithContraints, TeamPair } from './draw.utils';

let teamCounter = 0;
let playerCounter = 0;

function makePlayer(clubId: string | null): Player {
    playerCounter += 1;
    return {
        id: `player-${playerCounter}`,
        name: `Player ${playerCounter}`,
        club: clubId ? ({ id: clubId, name: clubId } as PlayerClub) : undefined,
    } as Player;
}

// Une entrée par joueur ; `null` = joueur sans club.
function makeTeam(clubIds: (string | null)[] = [null]): Team {
    teamCounter += 1;
    return {
        id: `team-${teamCounter}`,
        name: `Team ${teamCounter}`,
        code: `T${teamCounter}`,
        players: clubIds.map(makePlayer),
    } as Team;
}

function makeMatch(teamA: Team, teamB: Team): TournamentMatch {
    return { teamA, teamB } as TournamentMatch;
}

const STRICT_CONFIG: ConstraintConfig = {
    allowMatchAgainstFullSameClub: false,
    allowMatchAgainstPartialSameClub: false,
    allowRematch: false,
};

const PERMISSIVE_CONFIG: ConstraintConfig = {
    allowMatchAgainstFullSameClub: true,
    allowMatchAgainstPartialSameClub: true,
    allowRematch: true,
};

function pairContains(pairs: TeamPair[], a: Team, b: Team): boolean {
    return pairs.some(
        ([x, y]) => (x.id === a.id && y.id === b.id) || (x.id === b.id && y.id === a.id),
    );
}

function allTeamIds(pairs: TeamPair[]): string[] {
    return pairs.flatMap(([a, b]) => [a.id, b.id]);
}

describe('generatePairsWithContraints', () => {
    describe('cas à la marge', () => {
        it("retourne un tableau vide pour une liste d'équipes vide", () => {
            expect(generatePairsWithContraints(STRICT_CONFIG, [], [])).toEqual([]);
        });

        it('retourne un tableau vide pour une seule équipe (impossible à apparier)', () => {
            const team = makeTeam();
            expect(generatePairsWithContraints(STRICT_CONFIG, [team], [])).toEqual([]);
        });

        it("retourne un tableau vide pour un nombre impair d'équipes (le bye est géré par l'appelant, pas ici)", () => {
            const teams = [makeTeam(), makeTeam(), makeTeam()];
            expect(generatePairsWithContraints(STRICT_CONFIG, teams, [])).toEqual([]);
        });

        it("ne mute pas le tableau d'équipes reçu en entrée", () => {
            const teams = [makeTeam(), makeTeam(), makeTeam(), makeTeam()];
            const snapshot = [...teams];

            generatePairsWithContraints(STRICT_CONFIG, teams, []);

            expect(teams).toEqual(snapshot);
        });

        it("se replie sur une revanche quand c'est la seule paire possible (2 équipes, déjà jouée)", () => {
            const [a, b] = [makeTeam(), makeTeam()];
            const pastMatches = [makeMatch(a, b)];

            const pairs = generatePairsWithContraints(STRICT_CONFIG, [a, b], pastMatches);

            expect(pairs).toHaveLength(1);
            expect(pairContains(pairs, a, b)).toBe(true);
        });

        it("autorise deux équipes sans club à s'affronter même quand les matchs de même club sont interdits (non-régression : comparaison null)", () => {
            const a = makeTeam([null, null]);
            const b = makeTeam([null, null]);

            const pairs = generatePairsWithContraints(STRICT_CONFIG, [a, b], []);

            expect(pairs).toHaveLength(1);
            expect(pairContains(pairs, a, b)).toBe(true);
        });
    });

    it('apparie chaque équipe exactement une fois pour une poule simple sans historique', () => {
        const teams = [makeTeam(), makeTeam(), makeTeam(), makeTeam()];
        const pairs = generatePairsWithContraints(STRICT_CONFIG, teams, []);

        expect(pairs).toHaveLength(2);
        expect(allTeamIds(pairs).sort()).toEqual(teams.map((t) => t.id).sort());
    });

    it('produit un appariement complet et sans chevauchement pour une poule plus grande', () => {
        const teams = Array.from({ length: 8 }, () => makeTeam());

        const pairs = generatePairsWithContraints(STRICT_CONFIG, teams, []);

        expect(pairs).toHaveLength(4);
        const ids = allTeamIds(pairs);
        expect(new Set(ids).size).toBe(8);
        expect(ids.sort()).toEqual(teams.map((t) => t.id).sort());
    });

    it('évite une revanche quand une alternative existe', () => {
        const [a, b, c, d] = [makeTeam(), makeTeam(), makeTeam(), makeTeam()];
        const pastMatches = [makeMatch(a, b), makeMatch(c, d)];

        const pairs = generatePairsWithContraints(STRICT_CONFIG, [a, b, c, d], pastMatches);

        expect(pairContains(pairs, a, b)).toBe(false);
        expect(pairContains(pairs, c, d)).toBe(false);
    });

    it("n'apparie jamais deux équipes toutes deux homogènes du même club, quand une alternative existe", () => {
        const clubX = 'club-x';
        const a = makeTeam([clubX, clubX]);
        const b = makeTeam([clubX, clubX]);
        const c = makeTeam([null, null]);
        const d = makeTeam([null, null]);

        const pairs = generatePairsWithContraints(
            {
                allowMatchAgainstFullSameClub: false,
                allowMatchAgainstPartialSameClub: false,
                allowRematch: true,
            },
            [a, b, c, d],
            [],
        );

        expect(pairContains(pairs, a, b)).toBe(false);
    });

    it('évite un chevauchement même partiel de club quand configuré ainsi, si une alternative existe', () => {
        const clubX = 'club-x';
        const a = makeTeam([clubX, null]);
        const b = makeTeam([clubX, null]); // partage clubX avec `a`, mais aucune des deux n'est homogène
        const c = makeTeam([null, null]);
        const d = makeTeam([null, null]);

        const pairs = generatePairsWithContraints(
            {
                allowMatchAgainstFullSameClub: true,
                allowMatchAgainstPartialSameClub: false,
                allowRematch: true,
            },
            [a, b, c, d],
            [],
        );

        expect(pairContains(pairs, a, b)).toBe(false);
    });

    it("privilégie l'adversaire le moins souvent affronté une fois que tout le monde a déjà joué contre tout le monde (variation des adversaires)", () => {
        const [a, b, c, d] = [makeTeam(), makeTeam(), makeTeam(), makeTeam()];
        // Tout le monde s'est affronté une fois, sauf A-B qui se sont déjà affrontés deux fois.
        const pastMatches = [
            makeMatch(a, b),
            makeMatch(a, b),
            makeMatch(c, d),
            makeMatch(a, c),
            makeMatch(a, d),
            makeMatch(b, c),
            makeMatch(b, d),
        ];

        const pairs = generatePairsWithContraints(PERMISSIVE_CONFIG, [a, b, c, d], pastMatches);

        expect(pairContains(pairs, a, b)).toBe(false);
    });

    describe("à l'échelle réelle (régression du crash mémoire à 200 équipes)", () => {
        it('génère un appariement complet pour 200 équipes réparties sur des clubs concentrés, sans jamais réapparier deux équipes du même club', () => {
            // Reproduit le scénario réel : 25 clubs de 8 équipes chacun (homogènes), et la
            // configuration la plus stricte par défaut (ni revanche, ni même club). C'est
            // exactement ce qui faisait exploser le backtracking en mémoire.
            const clubCount = 25;
            const teamsPerClub = 8;
            const teams: Team[] = [];
            for (let club = 0; club < clubCount; club++) {
                for (let t = 0; t < teamsPerClub; t++) {
                    teams.push(makeTeam([`club-${club}`, `club-${club}`]));
                }
            }

            const start = Date.now();
            const pairs = generatePairsWithContraints(STRICT_CONFIG, teams, []);
            const elapsedMs = Date.now() - start;

            expect(elapsedMs).toBeLessThan(2000);
            expect(pairs).toHaveLength(100);
            expect(new Set(allTeamIds(pairs)).size).toBe(200);

            const teamClub = new Map(teams.map((t) => [t.id, t.players[0].club?.id]));
            for (const [a, b] of pairs) {
                expect(teamClub.get(a.id)).not.toBe(teamClub.get(b.id));
            }
        });

        it('ne plante pas et reste rapide pour 200 équipes sans aucune club en commun, sur plusieurs sessions successives (historique qui grandit)', () => {
            const teams = Array.from({ length: 200 }, () => makeTeam());
            let pastMatches: TournamentMatch[] = [];

            for (let session = 0; session < 3; session++) {
                const start = Date.now();
                const pairs = generatePairsWithContraints(STRICT_CONFIG, teams, pastMatches);
                const elapsedMs = Date.now() - start;

                expect(elapsedMs).toBeLessThan(2000);
                expect(pairs).toHaveLength(100);
                expect(new Set(allTeamIds(pairs)).size).toBe(200);

                pastMatches = [...pastMatches, ...pairs.map(([a, b]) => makeMatch(a, b))];
            }
        });
    });
});
