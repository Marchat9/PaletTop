import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TrainingMatch } from 'src/entities/training-match.entity';
import { TrainingParticipant } from 'src/entities/training-participant.entity';
import { TrainingRound } from 'src/entities/training-round.entity';
import { TrainingTeam } from 'src/entities/training-team.entity';
import { TrainingTeamMember } from 'src/entities/training-team-member.entity';
import { MatchStatus } from 'src/enum/status.enum';
import {
    TrainingParticipantStatus,
    TrainingRoundStatus,
    TrainingTeamKind,
} from 'src/enum/training.enum';
import {
    GenerateRoundInput,
    MATCHMAKING_PORT,
    MatchmakingPort,
} from '../domain/matchmaking/matchmaking.types';
import { TrainingRoundRepository } from '../repositories/training-round.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingRoundDto, toTrainingRoundDto } from '../responses/training-round.dto';
import { assertSessionOpen } from '../utils/session-guard.utils';
import { activeMembers } from '../utils/team-member.utils';
import { TrainingLeaderboardService } from './training-leaderboard.service';
import { TrainingSessionAuthService } from './training-session-auth.service';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';

@Injectable()
export class TrainingRoundsService {
    constructor(
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingRoundRepo: TrainingRoundRepository,
        private readonly trainingSessionAuthService: TrainingSessionAuthService,
        private readonly trainingLeaderboardService: TrainingLeaderboardService,
        private readonly trainingRealtimeGateway: TrainingRealtimeGateway,
        @Inject(MATCHMAKING_PORT) private readonly matchmaking: MatchmakingPort,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {}

    async generateNextRound(sessionCode: string, password: string): Promise<TrainingRoundDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            password,
        );
        assertSessionOpen(session);

        // Toute la séance, pas seulement le dernier round : la rotation du repos et celle des
        // binômes ont besoin de ce qui s'est passé avant.
        const rounds = await this.trainingRoundRepo.findAllBySession(session.id);
        const previousRound = rounds.at(-1) ?? null;
        if (previousRound) {
            const hasUnfinishedMatch = previousRound.matches.some(
                (match) => !match.isBye && match.status !== MatchStatus.VALIDATED,
            );
            if (hasUnfinishedMatch) {
                throw new BadRequestException(
                    'Tous les matchs du round précédent doivent être validés avant de générer le suivant.',
                );
            }
        }
        const nextRoundNumber = (previousRound?.roundNumber ?? 0) + 1;

        // Équipes FIXED "actives" = ayant >=1 membre actif (leftAt null) — une équipe entièrement
        // dissoute n'a plus de membre actif et est naturellement exclue ici, sans flag dédié.
        const activeFixedTeams = session.teams
            .filter((team) => team.kind === TrainingTeamKind.FIXED)
            .map((team) => ({
                id: team.id,
                participantIds: activeMembers(team.members).map((m) => m.participant.id),
            }))
            .filter((team) => team.participantIds.length > 0);

        const fixedParticipantIds = new Set(activeFixedTeams.flatMap((t) => t.participantIds));
        const soloParticipantIds = session.participants
            .filter(
                (p) =>
                    p.status === TrainingParticipantStatus.PRESENT &&
                    !fixedParticipantIds.has(p.id),
            )
            .map((p) => p.id);

        if (activeFixedTeams.length === 0 && soloParticipantIds.length === 0) {
            throw new BadRequestException('Aucun participant présent pour générer un round.');
        }

        const input: GenerateRoundInput = {
            fixedTeams: activeFixedTeams,
            soloParticipantIds,
            config: {
                playersPerTeam: session.playersPerTeam,
                allowedTeamSizes: session.allowedTeamSizes,
                preferTargetTeamSize: session.preferTargetTeamSize,
                plateCount: session.plateCount,
                teamComposition: session.teamComposition,
                avoidSamePartnerConsecutive: session.avoidSamePartnerConsecutive,
                avoidSameOpponentConsecutive: session.avoidSameOpponentConsecutive,
            },
            history: this.buildHistory(rounds),
            levelByParticipant: await this.trainingLeaderboardService.getAveragePointsBySessionId(
                session.id,
            ),
        };

        const plan = this.matchmaking.generateRound(input);
        const participantById = new Map<string, TrainingParticipant>(
            session.participants.map((p) => [p.id, p]),
        );

        // Round, équipes/membres éphémères et matchs dans une seule transaction
        const { savedRound, matchRows } = await this.dataSource.transaction(async (manager) => {
            const roundRepo = manager.getRepository(TrainingRound);
            const teamRepo = manager.getRepository(TrainingTeam);
            const teamMemberRepo = manager.getRepository(TrainingTeamMember);
            const matchRepo = manager.getRepository(TrainingMatch);

            if (previousRound && previousRound.status === TrainingRoundStatus.OPEN) {
                previousRound.status = TrainingRoundStatus.CLOSED;
                await roundRepo.save(previousRound);
            }

            const round = roundRepo.create({
                session,
                roundNumber: nextRoundNumber,
                status: TrainingRoundStatus.OPEN,
            });
            const savedRound = await roundRepo.save(round);

            // Sert à construire la réponse en mémoire ensuite (cf. plus bas), sans re-fetch :
            // équipes fixes déjà pleinement chargées via session.teams, équipes éphémères
            // complétées ci-dessous au fur et à mesure de leur création.
            const teamById = new Map<string, TrainingTeam>(
                session.teams
                    .filter((team) => team.kind === TrainingTeamKind.FIXED)
                    .map((team) => [team.id, team]),
            );

            // fixedTeam.id se référence lui-même (déjà une id réelle) ; les équipes éphémères ont
            // besoin d'être créées pour obtenir une id réelle avant de pouvoir être référencées
            // par les matchs.
            const refToTeamId = new Map<string, string>(activeFixedTeams.map((t) => [t.id, t.id]));

            // Équipes puis membres en deux requêtes batchées (au lieu de 2 requêtes par équipe
            // éphémère) : les créations sont indépendantes entre elles, seules les lignes membres
            // ont besoin des ids générés par le premier batch.
            if (plan.ephemeralTeams.length > 0) {
                const ephemeralTeamRows = plan.ephemeralTeams.map(() =>
                    teamRepo.create({
                        session,
                        round: savedRound,
                        kind: TrainingTeamKind.EPHEMERAL,
                    }),
                );
                const savedEphemeralTeams = await teamRepo.save(ephemeralTeamRows);

                const memberRows = plan.ephemeralTeams.flatMap((ephemeral, index) => {
                    const savedTeam = savedEphemeralTeams[index];
                    refToTeamId.set(ephemeral.tempId, savedTeam.id);
                    const members = ephemeral.participantIds.map((participantId) =>
                        teamMemberRepo.create({
                            team: savedTeam,
                            participant: participantById.get(participantId),
                            kind: TrainingTeamKind.EPHEMERAL,
                            leftAt: null,
                        }),
                    );
                    savedTeam.members = members;
                    teamById.set(savedTeam.id, savedTeam);
                    return members;
                });
                await teamMemberRepo.save(memberRows);
            }

            const matchRows = plan.matches.map((m) =>
                matchRepo.create({
                    round: savedRound,
                    session,
                    status: MatchStatus.PENDING,
                    teamA: teamById.get(refToTeamId.get(m.teamRef)!)!,
                    teamB: m.opponentRef ? teamById.get(refToTeamId.get(m.opponentRef)!)! : null,
                    isBye: m.opponentRef === null,
                }),
            );
            await matchRepo.save(matchRows);

            return { savedRound, matchRows };
        });

        await this.trainingSessionRepo.touchLastActivity(session.id);

        const roundDto = toTrainingRoundDto({ ...savedRound, matches: matchRows });
        this.trainingRealtimeGateway.emitRoundGenerated(sessionCode, roundDto);
        return roundDto;
    }

    async getRound(sessionCode: string, roundNumber: number): Promise<TrainingRoundDto> {
        const session = await this.trainingSessionRepo.findByCodeOrThrow(sessionCode);
        const round = await this.trainingRoundRepo.findBySessionAndNumber(session.id, roundNumber);
        if (!round) {
            throw new NotFoundException('Round introuvable pour cette session.');
        }
        return toTrainingRoundDto(round);
    }

    async listRounds(sessionCode: string): Promise<TrainingRoundDto[]> {
        const session = await this.trainingSessionRepo.findByCodeOrThrow(sessionCode);
        const rounds = await this.trainingRoundRepo.findAllBySession(session.id);
        return rounds.map(toTrainingRoundDto);
    }

    /**
     * Ce que la séance a déjà produit : les binômes et oppositions de chaque round, du plus
     * récent au plus ancien, et le nombre de fois où chacun s'est reposé.
     *
     * Les partenaires ne sont dérivés QUE des équipes EPHEMERAL (une équipe FIXED est censée
     * rejouer ensemble, ce n'est pas une répétition à éviter). L'identité « adversaire » est
     * canonique (fixedTeamId ou participantIds triés) car l'id de TrainingTeam d'une équipe
     * éphémère ne survit jamais d'un round à l'autre.
     */
    private buildHistory(rounds: TrainingRound[]): GenerateRoundInput['history'] {
        const sitOutCountByParticipant: Record<string, number> = {};
        const recentRounds = [];

        for (const round of rounds) {
            const partnerPairs: [string, string][] = [];
            const opponentCanonicalPairs: [string, string][] = [];

            for (const match of round.matches ?? []) {
                if (match.isBye) {
                    for (const participantId of this.activeMemberIds(match.teamA)) {
                        sitOutCountByParticipant[participantId] =
                            (sitOutCountByParticipant[participantId] ?? 0) + 1;
                    }
                    continue;
                }

                this.collectPartnerPairs(match.teamA, partnerPairs);
                if (match.teamB) {
                    this.collectPartnerPairs(match.teamB, partnerPairs);
                    opponentCanonicalPairs.push([
                        this.canonicalTeamId(match.teamA),
                        this.canonicalTeamId(match.teamB),
                    ]);
                }
            }

            recentRounds.unshift({ partnerPairs, opponentCanonicalPairs });
        }

        return { recentRounds, sitOutCountByParticipant };
    }

    private canonicalTeamId(team: TrainingTeam): string {
        if (team.kind === TrainingTeamKind.FIXED) return team.id;
        return this.activeMemberIds(team).sort().join(',');
    }

    private collectPartnerPairs(team: TrainingTeam, pairs: [string, string][]): void {
        if (team.kind !== TrainingTeamKind.EPHEMERAL) return;
        const ids = this.activeMemberIds(team);
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                pairs.push([ids[i], ids[j]]);
            }
        }
    }

    private activeMemberIds(team: TrainingTeam): string[] {
        return activeMembers(team.members).map((m) => m.participant.id);
    }
}
