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

interface JoinTournamentPayload {
    tournamentCode: string;
    teamCode?: string;
    password?: string;
}

export const WsAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const client: Socket = ctx.switchToWs().getClient();
    return client.handshake.auth;
});

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(RealtimeGateway.name);

    private readonly clientIdsByTournament: Map<string, string[]> = new Map();

    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentRepo: Repository<Tournament>,
        private readonly tournamentAuthService: TournamentAuthService,
    ) {}

    handleConnection(client: Socket) {
        const tournamentCode: string = client.handshake.auth.tournamentCode;
        const clientIds: string[] = this.clientIdsByTournament.get(tournamentCode) ?? [];

        this.clientIdsByTournament.set(tournamentCode, [...new Set([...clientIds, client.id])]);

        this.logger.debug(
            `[WS] New connection (${client.id}) to tournament '${tournamentCode}'. ${clientIds.length + 1} current connections.`,
        );
    }

    handleDisconnect(client: Socket) {
        const tournamentCode: string = client.handshake.auth.tournamentCode;
        const clientIds: string[] = this.clientIdsByTournament.get(tournamentCode) ?? [];

        this.clientIdsByTournament.set(
            tournamentCode,
            clientIds.filter((id) => id !== client.id),
        );

        this.logger.debug(
            `[WS] Disconnection (${client.id}) to tournament '${tournamentCode}'. ${clientIds.length - 1} current connections.`,
        );
    }

    @SubscribeMessage('join-tournament')
    async handleJoinTournament(
        @WsAuth() auth: JoinTournamentPayload,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const tournamentCode: string = auth.tournamentCode;
        const password: string | undefined = auth.password;
        const teamCode: string | undefined = auth.teamCode;

        const tournament = await this.tournamentRepo.findOneBy({ code: tournamentCode });
        if (!tournament) {
            client.emit('join-error', { message: 'Tournoi introuvable.' });
            return;
        }
        if (!password && !teamCode) {
            client.emit('join-error', { message: 'payload incomplet.' });
            return;
        }

        if (teamCode) {
            const team = tournament.teams.find((t) => t.code === teamCode);
            if (!team) {
                client.emit('join-error', { message: 'Équipe introuvable.' });
                return;
            }
            client.join(`tournament:${tournamentCode}`);
            client.join(`tournament:${tournamentCode}:team:${teamCode}`);
            this.logger.log(
                `[WS] ${client.id} joined rooms: 'tournament:${tournamentCode}' and 'tournament:${tournamentCode}:team:${teamCode}'.`,
            );
            return;
        }

        if (password) {
            const tournament = await this.tournamentAuthService.findWithAdminAuth(
                { code: tournamentCode },
                password,
            );

            if (!tournament) {
                client.emit('join-error', {
                    message: 'Tournoi innexistant ou mot de passe incorrect.',
                });
                return;
            }
            client.join(`tournament:${tournamentCode}`);
            client.join(`tournament:${tournamentCode}:admin`);
            this.logger.log(
                `[WS][Admin] ${client.id} joined rooms: 'tournament:${tournamentCode}' and 'tournament:${tournamentCode}:admin'`,
            );
            return;
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
