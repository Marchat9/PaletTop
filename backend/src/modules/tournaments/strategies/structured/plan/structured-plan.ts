import { bracketRounds, fillLevel } from './bracket-rounds';
import { layoutTeams, powerOfTwoCeil, splitTeams } from './bracket-split';
import {
    BracketRound,
    BracketSize,
    ComfortRange,
    PlanBracket,
    PlanGroup,
    PlanGroupKind,
    PlanOption,
    PlanOptionId,
    PlanRound,
    PlanWarning,
    StructuredPlanInput,
    TournamentPlan,
} from './plan.types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const QUALIFYING_GROUP_KEY = 'qualifying';
export const THIRD_PLACE_GROUP_KEY = 'third_place_match';

/** Group key of bracket `index` (0 = main, i = consolation i). */
export function bracketKey(index: number): string {
    return index === 0 ? 'principale' : `consolante_${index}`;
}

export function challengeKey(index: number): string {
    return `challenge_${bracketKey(index)}`;
}

function consolationLetter(index: number): string {
    return LETTERS[index - 1];
}

export function bracketLabel(index: number): string {
    return index === 0 ? 'Principale' : `Consolante ${consolationLetter(index)}`;
}

export function challengeLabel(index: number): string {
    return index === 0
        ? 'Challenge principale'
        : `Challenge consolante ${consolationLetter(index)}`;
}

function plural(count: number, singular: string, pluralForm: string): string {
    return count > 1 ? pluralForm : singular;
}

function sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
}

/** A group followed round after round: a bracket, its challenge or the 3rd place match. */
interface GroupTrack {
    key: string;
    label: string;
    kind: PlanGroupKind;
    /** Elimination round (1-based) of the group's first round. */
    startRound: number;
    rounds: BracketRound[];
}

interface ResolvedLayout {
    brackets: BracketSize[] | null;
    /** Sum of the target layout capacities (0 when the target cannot be split). */
    capacitySum: number;
    warnings: PlanWarning[];
}

/** Brackets of `teams` teams: target layout, extra consolation or plain re-split. */
function resolveLayout(teams: number, input: StructuredPlanInput): ResolvedLayout {
    const bracketCount = input.consolationCount + 1;
    const layout = layoutTeams(teams, input.targetCount, bracketCount, input.maxConsolations + 1);
    const { brackets, capacitySum } = layout;
    const surplus = teams - capacitySum;
    const resplit = `Les ${teams} équipes sont réparties à nouveau sur ${bracketCount} ${plural(bracketCount, 'tableau', 'tableaux')}.`;
    const extra = brackets?.find((b) => b.extra);

    if (brackets && extra && extra.capacity > brackets[0].capacity) {
        return {
            brackets: splitTeams(teams, bracketCount),
            capacitySum,
            warnings: [
                {
                    code: 'EXTRA_BRACKET',
                    level: 'info',
                    message: `Les ${surplus} équipes au-delà des ${capacitySum} prévues formeraient une consolante plus grande que le tableau principal. ${resplit}`,
                },
            ],
        };
    }
    if (extra) {
        const key = bracketKey(bracketCount);
        const singleMatch = extra.capacity === 2 ? ' Un seul match.' : '';
        return {
            brackets,
            capacitySum,
            warnings: [
                {
                    code: 'EXTRA_BRACKET',
                    level: 'info',
                    message: `${bracketLabel(bracketCount)} (en plus) : ${surplus} équipes au-delà des ${capacitySum} prévues.${singleMatch}`,
                    bracketKey: key,
                },
            ],
        };
    }
    if (layout.noRoomForExtra) {
        const warning: PlanWarning =
            surplus < 2
                ? {
                      code: 'BRACKET_TOO_SMALL',
                      level: 'info',
                      message: `Une seule équipe au-delà des ${capacitySum} prévues : pas de consolante en plus. ${resplit}`,
                  }
                : {
                      code: 'EXTRA_BRACKET',
                      level: 'info',
                      message: `Nombre maximal de consolantes atteint : les ${surplus} équipes au-delà des ${capacitySum} prévues ne forment pas de consolante en plus. ${resplit}`,
                  };
        return { brackets, capacitySum, warnings: [warning] };
    }
    return { brackets, capacitySum, warnings: [] };
}

function impossibleWarning(teams: number, input: StructuredPlanInput): PlanWarning {
    const bracketCount = input.consolationCount + 1;
    const validConsolationCounts: number[] = [];
    for (let count = 0; count <= input.maxConsolations; count++) {
        if (resolveLayout(teams, { ...input, consolationCount: count }).brackets) {
            validConsolationCounts.push(count);
        }
    }
    let message: string;
    if (teams < 2) {
        message = `Il faut au moins 2 équipes pour jouer les tableaux (${teams} ${plural(teams, 'équipe', 'équipes')}).`;
    } else {
        const split = splitTeams(input.targetCount, bracketCount)
            ? `${teams} équipes`
            : `l'objectif de ${input.targetCount} équipes`;
        message = `Impossible de répartir ${split} sur ${bracketCount} ${plural(bracketCount, 'tableau', 'tableaux')}.`;
    }
    message += validConsolationCounts.length
        ? ` Nombre de consolantes possible : ${validConsolationCounts.join(', ')}.`
        : ' Aucun nombre de consolantes ne convient.';
    return { code: 'IMPOSSIBLE', level: 'error', message, validConsolationCounts };
}

function fillWarning(bracket: PlanBracket, firstRound: BracketRound): PlanWarning | null {
    if (bracket.fillLevel === 'ok') {
        return null;
    }
    let message = `${bracket.label} : ${bracket.teamCount} équipes sur ${bracket.capacity}.`;
    const byes = firstRound.byes;
    if (byes > 0) {
        message += ` ${byes} ${plural(byes, 'équipe exemptée', 'équipes exemptées')} au 1er tour.`;
    }
    return {
        code: bracket.fillLevel === 'low' ? 'LOW_FILL' : 'MID_FILL',
        level: bracket.fillLevel === 'low' ? 'warning' : 'info',
        message,
        bracketKey: bracket.key,
    };
}

/** Label of elimination round `n`, named after the main bracket's stage for the last ones. */
function eliminationLabel(n: number, mainCapacity: number): string {
    const slots = mainCapacity / 2 ** (n - 1);
    if (slots === 8) {
        return 'Quarts de finale';
    }
    if (slots === 4) {
        return 'Demi-finales';
    }
    return slots === 2 ? 'Finale' : `Élimination ${n}`;
}

function qualifyingRounds(registered: number, count: number): PlanRound[] {
    const matchCount = Math.floor(registered / 2);
    const rounds: PlanRound[] = [];
    for (let n = 1; n <= count; n++) {
        rounds.push({
            number: n,
            kind: 'qualifying',
            label: `Phase qualificative ${n}/${count}`,
            groups: [
                {
                    key: QUALIFYING_GROUP_KEY,
                    label: 'Phase qualificative',
                    kind: 'qualifying',
                    teamCount: registered,
                    matchCount,
                    byeCount: registered % 2,
                    plateStart: 1,
                    plateEnd: matchCount,
                },
            ],
        });
    }
    return rounds;
}

function eliminationRounds(
    tracks: GroupTrack[],
    firstNumber: number,
    mainCapacity: number,
): PlanRound[] {
    const count = Math.max(...tracks.map((t) => t.startRound + t.rounds.length - 1));
    const rounds: PlanRound[] = [];
    for (let n = 1; n <= count; n++) {
        let plate = 0;
        const groups: PlanGroup[] = [];
        for (const track of tracks) {
            const round = track.rounds[n - track.startRound];
            if (!round) {
                continue;
            }
            groups.push({
                key: track.key,
                label: track.label,
                kind: track.kind,
                teamCount: round.teams,
                matchCount: round.matches,
                byeCount: round.byes,
                plateStart: plate + 1,
                plateEnd: plate + round.matches,
            });
            plate += round.matches;
        }
        rounds.push({
            number: firstNumber + n - 1,
            kind: 'elimination',
            label: eliminationLabel(n, mainCapacity),
            groups,
        });
    }
    return rounds;
}

function computeComfort(input: StructuredPlanInput): ComfortRange | null {
    const bracketCount = input.consolationCount + 1;
    const target = splitTeams(input.targetCount, bracketCount);
    if (!target) {
        return null;
    }
    const capacities = target.map((b) => b.capacity);
    const optimalCount = sum(capacities);
    let okFrom = optimalCount;
    let lowBelow = false;
    for (let count = optimalCount - 1; count >= 2; count--) {
        const split = splitTeams(count, bracketCount);
        if (!split || split.some((b, i) => b.capacity !== capacities[i])) {
            break;
        }
        if (split.some((b) => fillLevel(b.count, b.capacity, input.thresholds) === 'low')) {
            lowBelow = true;
            break;
        }
        okFrom = count;
    }

    const single = bracketCount === 1;
    const lastLetter = consolationLetter(bracketCount - 1);
    const sentences = [
        `Configuration optimale : ${optimalCount} équipes (${single ? 'le tableau est' : 'chaque tableau est'} une puissance de 2 : ${capacities.join(' + ')}).`,
    ];
    if (okFrom < optimalCount) {
        const exempt = single
            ? 'le tableau reste le même : des équipes sont exemptées au 1er tour'
            : `les tableaux restent les mêmes : la consolante ${lastLetter} a des équipes exemptées au 1er tour`;
        sentences.push(`De ${okFrom} à ${optimalCount - 1} équipes, ${exempt}.`);
    }
    if (okFrom > 2) {
        const reason = lowBelow
            ? `${single ? 'le tableau principal serait trop peu rempli' : `la consolante ${lastLetter} serait trop peu remplie`}`
            : 'les tableaux changent';
        sentences.push(
            `En dessous de ${okFrom}, ${reason} : l'app vous proposera une autre configuration.`,
        );
    }
    sentences.push(
        bracketCount <= input.maxConsolations
            ? `Au-delà de ${optimalCount}, les équipes en plus forment une consolante ${consolationLetter(bracketCount)}.`
            : `Au-delà de ${optimalCount}, il n'y a plus de place pour une consolante : les équipes sont réparties autrement.`,
    );
    return { optimalCount, okFrom, text: sentences.join(' ') };
}

/** The plan without its launch options. */
function buildPlan(input: StructuredPlanInput): TournamentPlan {
    const stopped = Math.min(Math.max(input.eliminatedAfterQualifying, 0), input.teamCount);
    const teams = input.teamCount - stopped;
    const layout = resolveLayout(teams, input);
    const base = { teamCount: teams, eliminatedAfterQualifying: stopped, options: [] };

    if (!layout.brackets) {
        return {
            ...base,
            brackets: [],
            rounds: [],
            totalRounds: 0,
            maxPlates: 0,
            warnings: [...layout.warnings, impossibleWarning(teams, input)],
            comfort: null,
        };
    }

    const warnings = [...layout.warnings];
    const brackets: PlanBracket[] = [];
    const tracks: GroupTrack[] = [];

    layout.brackets.forEach((size, index) => {
        const rounds = bracketRounds(size.count, size.capacity);
        const bracket: PlanBracket = {
            key: bracketKey(index),
            label: bracketLabel(index),
            capacity: size.capacity,
            teamCount: size.count,
            fillRatio: size.count / size.capacity,
            fillLevel: fillLevel(size.count, size.capacity, input.thresholds),
            extra: !!size.extra,
        };
        brackets.push(bracket);
        const fill = fillWarning(bracket, rounds[0]);
        if (fill) {
            warnings.push(fill);
        }
        tracks.push({
            key: bracket.key,
            label: bracket.label,
            kind: index === 0 ? 'main' : 'consolation',
            startRound: 1,
            rounds,
        });

        if (index === 0 && input.hasThirdPlaceMatch) {
            const semiFinal = rounds[rounds.length - 2];
            if (semiFinal?.matches === 2) {
                tracks.push({
                    key: THIRD_PLACE_GROUP_KEY,
                    label: 'Match pour la 3e place',
                    kind: 'third_place',
                    startRound: rounds.length,
                    rounds: [{ teams: 2, matches: 1, byes: 0, losers: 1 }],
                });
            } else {
                warnings.push({
                    code: 'NO_THIRD_PLACE',
                    level: 'warning',
                    message:
                        'Pas de match pour la 3e place : il faut deux demi-finales dans le tableau principal.',
                });
            }
        }

        if (input.hasChallenges) {
            const challengeTeams = rounds[0].losers;
            if (challengeTeams >= 2) {
                tracks.push({
                    key: challengeKey(index),
                    label: challengeLabel(index),
                    kind: 'challenge',
                    startRound: 2,
                    rounds: bracketRounds(challengeTeams, powerOfTwoCeil(challengeTeams)),
                });
            } else {
                warnings.push({
                    code: 'BRACKET_TOO_SMALL',
                    level: 'info',
                    message: `Pas de ${challengeLabel(index).toLowerCase()} : il n'aurait qu'une équipe.`,
                    bracketKey: challengeKey(index),
                });
            }
        }
    });

    const qualifying = qualifyingRounds(input.teamCount, input.numberOfQualifyingRounds);
    const elimination = eliminationRounds(tracks, qualifying.length + 1, brackets[0].capacity);
    const rounds = [...qualifying, ...elimination];
    return {
        ...base,
        brackets,
        rounds,
        totalRounds: rounds.length,
        maxPlates: Math.max(...rounds.map((r) => sum(r.groups.map((g) => g.matchCount)))),
        warnings,
        comfort: computeComfort(input),
    };
}

function isImpossible(plan: TournamentPlan): boolean {
    return plan.brackets.length === 0;
}

function bracketsText(plan: TournamentPlan): string {
    return plan.brackets
        .map((b) => (b.teamCount === b.capacity ? `${b.capacity}` : `${b.teamCount}/${b.capacity}`))
        .join(' · ');
}

function option(
    id: PlanOptionId,
    label: string,
    description: string,
    recommended: boolean,
    consolationCount: number,
    plan: TournamentPlan,
): PlanOption {
    return {
        id,
        label,
        description: isImpossible(plan)
            ? `${description} Configuration impossible.`
            : `${description} Tableaux : ${bracketsText(plan)}.`,
        recommended,
        consolationCount,
        eliminatedAfterQualifying: plan.eliminatedAfterQualifying,
        plan,
    };
}

/** Largest team count (at most `teams`) whose split fills every bracket exactly. */
function largestFullCount(teams: number, bracketCount: number): number | null {
    for (let count = teams; count >= 2; count--) {
        const split = splitTeams(count, bracketCount);
        if (split?.every((b) => b.count === b.capacity)) {
            return count;
        }
    }
    return null;
}

function stopLastOption(input: StructuredPlanInput, playing: number | null): PlanOption | null {
    if (playing === null || playing >= input.teamCount) {
        return null;
    }
    const stopped = input.teamCount - playing;
    const plan = buildPlan({ ...input, eliminatedAfterQualifying: stopped });
    if (isImpossible(plan)) {
        return null;
    }
    return option(
        'stop_last',
        stopped === 1
            ? 'Arrêter le dernier après les qualifs'
            : `Arrêter les ${stopped} derniers après les qualifs`,
        stopped === 1
            ? 'La dernière équipe des qualifs ne joue pas les tableaux.'
            : `Les ${stopped} dernières équipes des qualifs ne jouent pas les tableaux.`,
        false,
        input.consolationCount,
        plan,
    );
}

/** Launch options for the registered teams; the current configuration always comes first. */
function buildOptions(input: StructuredPlanInput, current: TournamentPlan): PlanOption[] {
    const teams = current.teamCount;
    const bracketCount = input.consolationCount + 1;
    const target = splitTeams(input.targetCount, bracketCount);
    const capacitySum = target ? sum(target.map((b) => b.capacity)) : 0;
    const keep = option(
        'keep',
        'Garder la configuration',
        'Les tableaux prévus.',
        !isImpossible(current) && !current.warnings.some((w) => w.code === 'LOW_FILL'),
        input.consolationCount,
        current,
    );
    if (capacitySum === 0 || teams === capacitySum) {
        return [keep];
    }

    const options: PlanOption[] = [];
    let recalculate: TournamentPlan | null = null;
    let recalculateText = '';
    let recalculateConsolations = input.consolationCount;
    let playing: number | null;

    if (teams < capacitySum) {
        options.push(keep);
        if (input.consolationCount >= 1) {
            recalculateConsolations = input.consolationCount - 1;
            recalculate = buildPlan({
                ...input,
                consolationCount: recalculateConsolations,
                targetCount: teams,
            });
            recalculateText = 'Une consolante de moins.';
        }
        playing = largestFullCount(teams, bracketCount);
    } else {
        const extra = current.brackets.find((b) => b.extra);
        if (extra) {
            options.push(
                option(
                    'add_consolation',
                    'Ajouter une consolante',
                    `Les ${extra.teamCount} équipes en plus forment la ${extra.label.toLowerCase()}.`,
                    true,
                    input.consolationCount + 1,
                    current,
                ),
            );
            recalculate = buildPlan({ ...input, targetCount: teams });
            recalculateText = `Même nombre de tableaux, recalculés pour ${teams} équipes.`;
        } else {
            options.push(keep);
        }
        playing = capacitySum;
    }

    if (recalculate && !isImpossible(recalculate)) {
        options.push(
            option(
                'recalculate',
                'Recalculer les tableaux',
                recalculateText,
                false,
                recalculateConsolations,
                recalculate,
            ),
        );
    }
    const stopLast = stopLastOption(input, playing);
    if (stopLast) {
        options.push(stopLast);
    }
    return options;
}

/**
 * Plans a structured tournament: bracket split, round-by-round groups with their plates,
 * fill warnings, comfort range and launch options.
 */
export function computeStructuredPlan(input: StructuredPlanInput): TournamentPlan {
    const plan = buildPlan(input);
    return { ...plan, options: buildOptions(input, plan) };
}
