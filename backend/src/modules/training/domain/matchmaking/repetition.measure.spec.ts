import { describe, expect, it } from 'vitest';
import { TrainingTeamComposition } from 'src/enum/training.enum';
import { DefaultMatchmakingStrategy } from './default-matchmaking.strategy';
import { GenerateRoundInput, RoundPlan } from './matchmaking.types';

/**
 * Measures how often pairs and opponents repeat from one round to the next, over simulated
 * sessions. Acts as a guard: the greedy placement used to get stuck on the last players and rebuild
 * pairs from the previous round.
 */

function playingTeams(plan: RoundPlan) {
    return plan.ephemeralTeams.filter((team) => !team.tempId.startsWith('sit-out'));
}

function partnersOf(plan: RoundPlan): [string, string][] {
    const pairs: [string, string][] = [];
    for (const team of playingTeams(plan)) {
        const ids = [...team.participantIds].sort();
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);
        }
    }
    return pairs;
}

function opponentsOf(plan: RoundPlan): [string, string][] {
    const canonical = new Map(
        plan.ephemeralTeams.map((t) => [t.tempId, [...t.participantIds].sort().join(',')]),
    );
    return plan.matches
        .filter((m) => m.opponentRef !== null)
        .map(
            (m) => [canonical.get(m.teamRef)!, canonical.get(m.opponentRef!)!] as [string, string],
        );
}

function restingOf(plan: RoundPlan): string[] {
    return plan.ephemeralTeams
        .filter((team) => team.tempId.startsWith('sit-out'))
        .flatMap((team) => team.participantIds);
}

function fallbackOf(plan: RoundPlan, playersPerTeam: number): string[] {
    return playingTeams(plan)
        .filter((team) => team.participantIds.length !== playersPerTeam)
        .flatMap((team) => team.participantIds);
}

interface SimulationOptions {
    playersPerTeam: number;
    allowedTeamSizes: number[];
    teamComposition: TrainingTeamComposition;
}

const ONE_V_ONE_FALLBACK: SimulationOptions = {
    playersPerTeam: 2,
    allowedTeamSizes: [1],
    teamComposition: TrainingTeamComposition.RANDOM,
};

function simulate(
    playerCount: number,
    rounds: number,
    options: SimulationOptions = ONE_V_ONE_FALLBACK,
    seed = 1,
) {
    // Reproducible random: the measure must give the same figure on every run.
    let state = seed;
    const random = () => {
        state = (state * 1103515245 + 12345) % 2147483648;
        return state / 2147483648;
    };
    const strategy = new DefaultMatchmakingStrategy(random);
    const solos = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);

    const recentRounds: GenerateRoundInput['history']['recentRounds'] = [];
    const sitOutCountByParticipant: Record<string, number> = {};
    const fallbackCountByParticipant: Record<string, number> = {};
    // A level per player, so the learning mode has a ranking to band.
    const levelByParticipant = Object.fromEntries(solos.map((id, index) => [id, -index]));
    let repeatedPartners = 0;
    let repeatedOpponents = 0;
    let consecutiveFallbacks = 0;
    let longestFallbackStreak = 0;
    const fallbackStreak: Record<string, number> = {};
    const started = performance.now();

    for (let round = 0; round < rounds; round++) {
        const plan = strategy.generateRound({
            fixedTeams: [],
            soloParticipantIds: solos,
            config: {
                playersPerTeam: options.playersPerTeam,
                allowedTeamSizes: options.allowedTeamSizes,
                preferTargetTeamSize: false,
                plateCount: 99,
                teamComposition: options.teamComposition,
                avoidSamePartnerConsecutive: true,
                avoidSameOpponentConsecutive: true,
            },
            history: { recentRounds, sitOutCountByParticipant, fallbackCountByParticipant },
            levelByParticipant,
        });

        const forbiddenPartners = new Set(
            (recentRounds[0]?.partnerPairs ?? []).map(([a, b]) => `${a}|${b}`),
        );
        const forbiddenOpponents = new Set(
            (recentRounds[0]?.opponentCanonicalPairs ?? []).map(([a, b]) =>
                [a, b].sort().join('|'),
            ),
        );
        repeatedPartners += partnersOf(plan).filter(([a, b]) =>
            forbiddenPartners.has(`${a}|${b}`),
        ).length;
        repeatedOpponents += opponentsOf(plan).filter(([a, b]) =>
            forbiddenOpponents.has([a, b].sort().join('|')),
        ).length;

        const fallback = fallbackOf(plan, options.playersPerTeam);
        const previousFallback = new Set(recentRounds[0]?.fallbackParticipantIds ?? []);
        consecutiveFallbacks += fallback.filter((id) => previousFallback.has(id)).length;
        for (const id of solos) {
            fallbackStreak[id] = fallback.includes(id) ? (fallbackStreak[id] ?? 0) + 1 : 0;
            longestFallbackStreak = Math.max(longestFallbackStreak, fallbackStreak[id]);
        }

        for (const participantId of restingOf(plan)) {
            sitOutCountByParticipant[participantId] =
                (sitOutCountByParticipant[participantId] ?? 0) + 1;
        }
        for (const participantId of fallback) {
            fallbackCountByParticipant[participantId] =
                (fallbackCountByParticipant[participantId] ?? 0) + 1;
        }
        recentRounds.unshift({
            partnerPairs: partnersOf(plan),
            opponentCanonicalPairs: opponentsOf(plan),
            fallbackParticipantIds: fallback,
            restingParticipantIds: restingOf(plan),
        });
    }

    const restCounts = solos.map((id) => sitOutCountByParticipant[id] ?? 0);
    const fallbackCounts = solos.map((id) => fallbackCountByParticipant[id] ?? 0);
    return {
        repeatedPartners,
        repeatedOpponents,
        restSpread: Math.max(...restCounts) - Math.min(...restCounts),
        fallbackSpread: Math.max(...fallbackCounts) - Math.min(...fallbackCounts),
        consecutiveFallbacks,
        longestFallbackStreak,
        ms: performance.now() - started,
    };
}

describe('rotation des binômes et des adversaires', () => {
    for (const playerCount of [6, 8, 12, 20]) {
        it(`ne répète aucun binôme sur 50 rounds à ${playerCount} joueurs`, () => {
            const { repeatedPartners, repeatedOpponents, restSpread, ms } = simulate(
                playerCount,
                50,
            );
            console.log(
                `${playerCount} joueurs / 50 rounds : ${repeatedPartners} binôme(s) répété(s), ` +
                    `${repeatedOpponents} adversaire(s) répété(s), écart de repos ${restSpread}, ` +
                    `${ms.toFixed(1)} ms au total`,
            );
            expect(repeatedPartners).toBe(0);
            expect(repeatedOpponents).toBe(0);
            // Rest rotates: nobody should rest much more than the others.
            expect(restSpread).toBeLessThanOrEqual(1);
        });
    }
});

describe('rotation des équipes de repli', () => {
    for (const teamComposition of [
        TrainingTeamComposition.RANDOM,
        TrainingTeamComposition.LEARNING,
    ]) {
        it(`ne remet personne en trio deux rounds de suite à 22 joueurs (${teamComposition})`, () => {
            // 22 players in teams of 2 would leave one team without an opponent: two trios each
            // round, i.e. 6 fallback slots for 22 players.
            const { consecutiveFallbacks, fallbackSpread } = simulate(22, 30, {
                playersPerTeam: 2,
                allowedTeamSizes: [3],
                teamComposition,
            });
            expect(consecutiveFallbacks).toBe(0);
            // Fallback rotates: nobody plays in a trio much more often than the others.
            expect(fallbackSpread).toBeLessThanOrEqual(1);
        });

        for (const playerCount of [5, 15]) {
            it(`limite les trios d'affilée à deux à ${playerCount} joueurs (${teamComposition})`, () => {
                // More than half the players are in a trio each round: some must chain two, but a
                // regular rotation never needs a third in a row.
                const { longestFallbackStreak, fallbackSpread } = simulate(playerCount, 30, {
                    playersPerTeam: 2,
                    allowedTeamSizes: [3],
                    teamComposition,
                });
                expect(longestFallbackStreak).toBeLessThanOrEqual(2);
                expect(fallbackSpread).toBeLessThanOrEqual(1);
            });
        }
    }
});
