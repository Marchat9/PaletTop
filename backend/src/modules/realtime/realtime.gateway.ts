import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Tournament } from 'src/entities/tournament.entity';
import { Repository } from 'typeorm';
import { TournamentAuthService } from '../tournaments/services/tournament-auth.service';
import { corsOrigin } from 'src/utils/cors-origin.util';

interface JoinTournamentPayload {
    tournamentCode: string;
    teamCode?: string;
    password?: string;
}

// What a socket is connected to, read from its handshake: a tournament or a training session.
interface ConnectionTarget {
    key: string;
    label: string;
}

export function resolveConnectionTarget(auth: Record<string, unknown>): ConnectionTarget {
    if (typeof auth.tournamentCode === 'string' && auth.tournamentCode) {
        return {
            key: `tournament:${auth.tournamentCode}`,
            label: `tournament '${auth.tournamentCode}'`,
        };
    }
    if (typeof auth.sessionCode === 'string' && auth.sessionCode) {
        return {
            key: `training-session:${auth.sessionCode}`,
            label: `training session '${auth.sessionCode}'`,
        };
    }
    return { key: 'unknown', label: 'no tournament or training session' };
}

// Wrong team codes or passwords tolerated on one socket before it is disconnected: the join answer
// tells a valid code from a wrong one, so unlimited attempts would let a client guess team codes.
export const MAX_FAILED_JOINS_PER_SOCKET = 5;

export const WsAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const client: Socket = ctx.switchToWs().getClient();
    return client.handshake.auth;
});

@WebSocketGateway({ cors: { origin: corsOrigin() } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(RealtimeGateway.name);

    // Every socket goes through these hooks, tournament or training: both gateways share the
    // default namespace. The count is kept per tournament and per training session.
    private readonly clientIdsByTarget: Map<string, string[]> = new Map();

    private readonly failedJoinsBySocket: Map<string, number> = new Map();

    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentRepo: Repository<Tournament>,
        private readonly tournamentAuthService: TournamentAuthService,
    ) {}

    handleConnection(client: Socket) {
        const target = resolveConnectionTarget(client.handshake.auth);
        const clientIds: string[] = [
            ...new Set([...(this.clientIdsByTarget.get(target.key) ?? []), client.id]),
        ];
        this.clientIdsByTarget.set(target.key, clientIds);

        this.logger.debug(
            `[WS] New connection (${client.id}) to ${target.label}. ${clientIds.length} current connections.`,
        );
    }

    handleDisconnect(client: Socket) {
        this.failedJoinsBySocket.delete(client.id);
        const target = resolveConnectionTarget(client.handshake.auth);
        const remainingIds: string[] = (this.clientIdsByTarget.get(target.key) ?? []).filter(
            (id) => id !== client.id,
        );

        // An empty entry is dropped: otherwise every tournament and session ever played would stay
        // in memory until the next restart.
        if (remainingIds.length > 0) {
            this.clientIdsByTarget.set(target.key, remainingIds);
        } else {
            this.clientIdsByTarget.delete(target.key);
        }

        this.logger.debug(
            `[WS] Disconnection (${client.id}) from ${target.label}. ${remainingIds.length} current connections.`,
        );
    }

    @SubscribeMessage('join-tournament')
    async handleJoinTournament(
        @WsAuth() auth: JoinTournamentPayload,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const tournamentCode: string | undefined = auth?.tournamentCode;
        const password: string | undefined = auth?.password;
        const teamCode: string | undefined = auth?.teamCode;

        // Without a code, findOneBy({ code: undefined }) has no condition and returns any
        // tournament. A training socket never sends this event: it joins with its session code.
        if (typeof tournamentCode !== 'string' || !tournamentCode) {
            client.emit('join-error', { message: 'tournamentCode requis.' });
            return;
        }

        const tournament = await this.tournamentRepo.findOneBy({ code: tournamentCode });
        if (!tournament) {
            this.rejectJoin(client, 'Tournoi introuvable.');
            return;
        }

        if (teamCode) {
            const team = tournament.teams.find((t) => t.code === teamCode);
            if (!team) {
                this.rejectJoin(client, 'Équipe introuvable.');
                return;
            }
            void client.join(`tournament:${tournamentCode}`);
            void client.join(`tournament:${tournamentCode}:team:${teamCode}`);
            this.logger.log(
                `[WS] ${client.id} joined rooms: 'tournament:${tournamentCode}' and 'tournament:${tournamentCode}:team:${teamCode}'.`,
            );
            return;
        }

        if (password) {
            // findWithAdminAuth throws on a wrong password: uncaught, the client only got Nest's
            // generic "Internal server error" exception instead of a join-error.
            try {
                await this.tournamentAuthService.findWithAdminAuth(
                    { code: tournamentCode },
                    password,
                );
            } catch {
                this.rejectJoin(client, 'Tournoi inexistant ou mot de passe incorrect.');
                return;
            }
            void client.join(`tournament:${tournamentCode}`);
            void client.join(`tournament:${tournamentCode}:admin`);
            this.logger.log(
                `[WS][Admin] ${client.id} joined rooms: 'tournament:${tournamentCode}' and 'tournament:${tournamentCode}:admin'`,
            );
            return;
        }

        // Spectator: neither a team code nor a password — read-only access to
        // the tournament's public broadcasts (session/tournament/ranking on the
        // general room, match updates on the dedicated spectator room).
        void client.join(`tournament:${tournamentCode}`);
        void client.join(`tournament:${tournamentCode}:spectator`);
        this.logger.log(
            `[WS][Spectator] ${client.id} joined rooms: 'tournament:${tournamentCode}' and 'tournament:${tournamentCode}:spectator'.`,
        );
    }

    /** Answers a failed join, and disconnects the socket once it has failed too many times. */
    private rejectJoin(client: Socket, message: string): void {
        const failures = (this.failedJoinsBySocket.get(client.id) ?? 0) + 1;
        this.failedJoinsBySocket.set(client.id, failures);
        client.emit('join-error', { message });

        if (failures >= MAX_FAILED_JOINS_PER_SOCKET) {
            this.logger.warn(`[WS] ${client.id} disconnected after ${failures} failed joins.`);
            client.disconnect(true);
        }
    }

    emitMatchUpdated(
        code: string,
        teamACode: string,
        teamBCode: string | null,
        payload: unknown,
    ): void {
        this.server.to(`tournament:${code}:team:${teamACode}`).emit('match:updated', payload);
        if (teamBCode) {
            this.server.to(`tournament:${code}:team:${teamBCode}`).emit('match:updated', payload);
        }
        this.server.to(`tournament:${code}:admin`).emit('match:updated', payload);
        this.server.to(`tournament:${code}:spectator`).emit('match:updated', payload);
    }

    emitSessionUpdated(code: string, session: unknown): void {
        this.server.to(`tournament:${code}`).emit('session:updated', { session });
    }

    emitTournamentUpdated(code: string, tournament: unknown): void {
        this.server.to(`tournament:${code}`).emit('tournament:updated', { tournament });
    }

    emitHistoryUpdated(code: string, teamCode: string, history: unknown[]): void {
        this.server.to(`tournament:${code}:team:${teamCode}`).emit('history:updated', history);
    }

    emitRankingUpdated(code: string, ranking: unknown[]): void {
        this.server.to(`tournament:${code}`).emit('ranking:updated', ranking);
    }
}
