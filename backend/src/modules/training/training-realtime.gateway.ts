import { Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuth } from '../realtime/realtime.gateway';

interface JoinTrainingSessionAuth {
    sessionCode: string;
}

// Room unique par session : contrairement au tournoi (rooms par équipe + admin + spectateur),
// tous les payloads diffusés ici (TrainingSessionPublicDto, TrainingMatchDto, TrainingRoundDto,
// classement) sont déjà "publics" par construction — aucun ne porte jamais le code personnel d'un
// participant (cf. décision produit Phase 4). Rien à distinguer entre admin/joueur/spectateur.
@WebSocketGateway({ cors: { origin: '*' } })
export class TrainingRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(TrainingRealtimeGateway.name);

    handleConnection(client: Socket): void {
        this.logger.debug(`[WS][Training] New connection (${client.id}).`);
    }

    handleDisconnect(client: Socket): void {
        this.logger.debug(`[WS][Training] Disconnection (${client.id}).`);
    }

    @SubscribeMessage('join-training-session')
    handleJoinTrainingSession(
        @WsAuth() auth: JoinTrainingSessionAuth,
        @ConnectedSocket() client: Socket,
    ): void {
        const sessionCode = auth?.sessionCode;
        if (!sessionCode) {
            client.emit('join-error', { message: 'sessionCode requis.' });
            return;
        }

        void client.join(`training-session:${sessionCode}`);
        this.logger.log(
            `[WS][Training] ${client.id} joined room 'training-session:${sessionCode}'.`,
        );
    }

    emitSessionUpdated(sessionCode: string, session: unknown): void {
        this.server.to(`training-session:${sessionCode}`).emit('session:updated', session);
    }

    emitRoundGenerated(sessionCode: string, round: unknown): void {
        this.server.to(`training-session:${sessionCode}`).emit('round:generated', round);
    }

    emitMatchUpdated(sessionCode: string, match: unknown): void {
        this.server.to(`training-session:${sessionCode}`).emit('match:updated', match);
    }

    emitLeaderboardUpdated(sessionCode: string, leaderboard: unknown): void {
        this.server.to(`training-session:${sessionCode}`).emit('leaderboard:updated', leaderboard);
    }
}
