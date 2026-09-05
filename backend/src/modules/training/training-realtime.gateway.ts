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
import { TrainingSession } from 'src/entities/training-session.entity';
import { toTrainingSessionPublicDto } from './responses/training-session.dto';

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
        this.safeEmit(sessionCode, 'session:updated', session);
    }

    // Combine le mapping DTO et la diffusion : évite que chaque service appelant réécrive
    // `emitSessionUpdated(session.code, toTrainingSessionPublicDto(session))` de son côté.
    emitSessionUpdatedFrom(session: TrainingSession): void {
        this.emitSessionUpdated(session.code, toTrainingSessionPublicDto(session));
    }

    emitRoundGenerated(sessionCode: string, round: unknown): void {
        this.safeEmit(sessionCode, 'round:generated', round);
    }

    emitMatchUpdated(sessionCode: string, match: unknown): void {
        this.safeEmit(sessionCode, 'match:updated', match);
    }

    emitLeaderboardUpdated(sessionCode: string, leaderboard: unknown): void {
        this.safeEmit(sessionCode, 'leaderboard:updated', leaderboard);
    }

    // À ce stade, l'écriture correspondante est déjà commitée en base : un échec de diffusion
    // websocket ne doit jamais remonter comme une erreur HTTP (le client se verrait renvoyer un
    // 500 pour une action qui a pourtant réussi, et risquerait de la retenter en pure perte).
    private safeEmit(sessionCode: string, event: string, payload: unknown): void {
        try {
            this.server.to(`training-session:${sessionCode}`).emit(event, payload);
        } catch (error) {
            this.logger.error(
                `Échec de diffusion websocket '${event}' pour la session ${sessionCode}`,
                error,
            );
        }
    }
}
