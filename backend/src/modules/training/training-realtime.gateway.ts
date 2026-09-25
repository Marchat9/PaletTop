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
import {
    toTrainingSessionAdminDto,
    toTrainingSessionPublicDto,
} from './responses/training-session.dto';
import { TrainingSessionAuthService } from './services/training-session-auth.service';

interface JoinTrainingSessionAuth {
    sessionCode: string;
    password?: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class TrainingRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(TrainingRealtimeGateway.name);

    constructor(private readonly trainingSessionAuthService: TrainingSessionAuthService) {}

    handleConnection(client: Socket): void {
        this.logger.debug(`[WS][Training] New connection (${client.id}).`);
    }

    handleDisconnect(client: Socket): void {
        this.logger.debug(`[WS][Training] Disconnection (${client.id}).`);
    }

    @SubscribeMessage('join-training-session')
    async handleJoinTrainingSession(
        @WsAuth() auth: JoinTrainingSessionAuth,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        const sessionCode = auth?.sessionCode;
        if (!sessionCode) {
            client.emit('join-error', { message: 'sessionCode requis.' });
            return;
        }

        if (auth.password) {
            try {
                await this.trainingSessionAuthService.findWithAdminAuth(sessionCode, auth.password);
            } catch {
                client.emit('join-error', {
                    message: 'Session introuvable ou mot de passe invalide.',
                });
                return;
            }

            void client.join(this.adminRoom(sessionCode));
            this.logger.log(
                `[WS][Training][Admin] ${client.id} joined room '${this.adminRoom(sessionCode)}'.`,
            );
            return;
        }

        void client.join(this.publicRoom(sessionCode));
        this.logger.log(
            `[WS][Training] ${client.id} joined room '${this.publicRoom(sessionCode)}'.`,
        );
    }

    // The only event whose content differs by audience: each room gets its own projection of the
    // session.
    emitSessionUpdatedFrom(session: TrainingSession): void {
        this.safeEmit('session:updated', session.code, () => {
            this.server
                .to(this.publicRoom(session.code))
                .emit('session:updated', toTrainingSessionPublicDto(session));
            this.server
                .to(this.adminRoom(session.code))
                .emit('session:updated', toTrainingSessionAdminDto(session));
        });
    }

    emitRoundGenerated(sessionCode: string, round: unknown): void {
        this.broadcast(sessionCode, 'round:generated', round);
    }

    emitMatchUpdated(sessionCode: string, match: unknown): void {
        this.broadcast(sessionCode, 'match:updated', match);
    }

    emitLeaderboardUpdated(sessionCode: string, leaderboard: unknown): void {
        this.broadcast(sessionCode, 'leaderboard:updated', leaderboard);
    }

    // Same payload for both audiences: a single broadcast over the union of the rooms, socket.io
    // delivering only once to a socket present in several of them.
    private broadcast(sessionCode: string, event: string, payload: unknown): void {
        this.safeEmit(event, sessionCode, () => {
            this.server
                .to(this.publicRoom(sessionCode))
                .to(this.adminRoom(sessionCode))
                .emit(event, payload);
        });
    }

    // At this point the matching write is already committed: a websocket broadcast failure must
    // never surface as an HTTP error (the client would get a 500 for an action that did succeed,
    // and might retry it for nothing).
    private safeEmit(event: string, sessionCode: string, emit: () => void): void {
        try {
            emit();
        } catch (error) {
            this.logger.error(
                `Échec de diffusion websocket '${event}' pour la session ${sessionCode}`,
                error,
            );
        }
    }

    private publicRoom(sessionCode: string): string {
        return `training-session:${sessionCode}`;
    }

    private adminRoom(sessionCode: string): string {
        return `training-session:${sessionCode}:admin`;
    }
}
