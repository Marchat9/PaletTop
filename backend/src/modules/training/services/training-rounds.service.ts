import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TrainingParticipant } from 'src/entities/training-participant.entity';
import { TrainingRound } from 'src/entities/training-round.entity';
import { TrainingTeam } from 'src/entities/training-team.entity';
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
import { TrainingMatchRepository } from '../repositories/training-match.repository';
import { TrainingRoundRepository } from '../repositories/training-round.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingTeamMemberRepository } from '../repositories/training-team-member.repository';
import { TrainingTeamRepository } from '../repositories/training-team.repository';
import { TrainingRoundDto, toTrainingRoundDto } from '../responses/training-round.dto';
import { TrainingSessionAuthService } from './training-session-auth.service';

@Injectable()
export class TrainingRoundsService {
    constructor(
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingRoundRepo: TrainingRoundRepository,
        private readonly trainingTeamRepo: TrainingTeamRepository,
        private readonly trainingTeamMemberRepo: TrainingTeamMemberRepository,
        private readonly trainingMatchRepo: TrainingMatchRepository,
        private readonly trainingSessionAuthService: TrainingSessionAuthService,
        @Inject(MATCHMAKING_PORT) private readonly matchmaking: MatchmakingPort,
    ) {}

    async generateNextRound(sessionCode: string, password: string): Promise<TrainingRoundDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            password,
        );

        const previousRound = await this.trainingRoundRepo.findLatestBySession(session.id);
        if (previousRound && previousRound.status === TrainingRoundStatus.OPEN) {
            previousRound.status = TrainingRoundStatus.CLOSED;
            await this.trainingRoundRepo.save(previousRound);
        }
        const nextRoundNumber = (previousRound?.roundNumber ?? 0) + 1;

        // Équipes FIXED "actives" = ayant >=1 membre actif (leftAt null) — une équipe entièrement
        // dissoute n'a plus de membre actif et est naturellement exclue ici, sans flag dédié.
        const activeFixedTeams = session.teams
            .filter((team) => team.kind === TrainingTeamKind.FIXED)
            .map((team) => ({
                id: team.id,
                participantIds: team.members.filter((m) => !m.leftAt).map((m) => m.participant.id),
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

        const input: GenerateRoundInput = {
            fixedTeams: activeFixedTeams,
            soloParticipantIds,
            config: {
                playersPerTeam: session.playersPerTeam,
                fallbackTeamSize: session.fallbackTeamSize,
                allowSitOut: session.allowSitOut,
                avoidSamePartnerConsecutive: session.avoidSamePartnerConsecutive,
                avoidSameOpponentConsecutive: session.avoidSameOpponentConsecutive,
            },
            history: this.buildHistory(previousRound),
        };

        const plan = this.matchmaking.generateRound(input);

        const round = this.trainingRoundRepo.create({
            session,
            roundNumber: nextRoundNumber,
            status: TrainingRoundStatus.OPEN,
        });
        const savedRound = await this.trainingRoundRepo.save(round);

        const participantById = new Map<string, TrainingParticipant>(
            session.participants.map((p) => [p.id, p]),
        );

        // fixedTeam.id se référence lui-même (déjà une id réelle) ; les équipes éphémères ont
        // besoin d'être créées pour obtenir une id réelle avant de pouvoir être référencées par
        // les matchs.
        const refToTeamId = new Map<string, string>(activeFixedTeams.map((t) => [t.id, t.id]));

        for (const ephemeral of plan.ephemeralTeams) {
            const team = this.trainingTeamRepo.create({
                session,
                round: savedRound,
                kind: TrainingTeamKind.EPHEMERAL,
            });
            const savedTeam = await this.trainingTeamRepo.save(team);
            refToTeamId.set(ephemeral.tempId, savedTeam.id);

            const memberRows = ephemeral.participantIds.map((participantId) =>
                this.trainingTeamMemberRepo.create({
                    team: savedTeam,
                    participant: participantById.get(participantId),
                    leftAt: null,
                }),
            );
            await this.trainingTeamMemberRepo.save(memberRows);
        }

        const matchRows = plan.matches.map((m) =>
            this.trainingMatchRepo.create({
                round: savedRound,
                session,
                status: MatchStatus.PENDING,
                teamA: { id: refToTeamId.get(m.teamRef) } as TrainingTeam,
                teamB: m.opponentRef
                    ? ({ id: refToTeamId.get(m.opponentRef) } as TrainingTeam)
                    : null,
                isBye: m.opponentRef === null,
            }),
        );
        await this.trainingMatchRepo.save(matchRows);

        await this.trainingSessionRepo.touchLastActivity(session.id);

        return this.getRound(sessionCode, nextRoundNumber);
    }

    async getRound(sessionCode: string, roundNumber: number): Promise<TrainingRoundDto> {
        const session = await this.trainingSessionRepo.findByCode(sessionCode);
        if (!session) {
            throw new NotFoundException('Session introuvable.');
        }
        const round = await this.trainingRoundRepo.findBySessionAndNumber(session.id, roundNumber);
        if (!round) {
            throw new NotFoundException('Round introuvable pour cette session.');
        }
        return toTrainingRoundDto(round);
    }

    /**
     * Un seul round de recul (N-1), cf. contrat du port. Les partenaires ne sont dérivés QUE des
     * équipes EPHEMERAL (une équipe FIXED est censée rejouer ensemble, ce n'est pas une répétition
     * à éviter). L'identité "adversaire" est canonique (fixedTeamId ou participantIds triés) car
     * l'id de TrainingTeam d'une équipe éphémère ne survit jamais d'un round à l'autre.
     */
    private buildHistory(previousRound: TrainingRound | null): GenerateRoundInput['history'] {
        const previousRoundPartnerPairs: [string, string][] = [];
        const previousRoundOpponentCanonicalPairs: [string, string][] = [];

        for (const match of previousRound?.matches ?? []) {
            this.collectPartnerPairs(match.teamA, previousRoundPartnerPairs);
            if (match.teamB) {
                this.collectPartnerPairs(match.teamB, previousRoundPartnerPairs);
                previousRoundOpponentCanonicalPairs.push([
                    this.canonicalTeamId(match.teamA),
                    this.canonicalTeamId(match.teamB),
                ]);
            }
        }

        return { previousRoundPartnerPairs, previousRoundOpponentCanonicalPairs };
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
        return (team.members ?? []).filter((m) => !m.leftAt).map((m) => m.participant.id);
    }
}
