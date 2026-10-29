import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { Repository } from 'typeorm';
import { Socket } from 'socket.io';
import { Tournament } from 'src/entities/tournament.entity';
import { RealtimeGateway, resolveConnectionTarget } from './realtime.gateway';
import { TournamentAuthService } from '../tournaments/services/tournament-auth.service';

function makeGateway(tournament: Partial<Tournament> | null) {
    const tournamentRepo = {
        findOneBy: vi.fn().mockResolvedValue(tournament),
    } as unknown as Repository<Tournament>;
    const tournamentAuthService = {} as TournamentAuthService;
    const gateway = new RealtimeGateway(tournamentRepo, tournamentAuthService);
    const emitToRoom = vi.fn();
    gateway.server = { to: vi.fn().mockReturnValue({ emit: emitToRoom }) } as any;
    return { gateway, emitToRoom };
}

function makeClient(): Socket {
    return {
        id: 'client-1',
        join: vi.fn(),
        emit: vi.fn(),
    } as unknown as Socket;
}

describe('RealtimeGateway spectator join', () => {
    it('joins the general and spectator rooms when neither teamCode nor password is given', async () => {
        const { gateway } = makeGateway({ code: 'ABC123' } as Tournament);
        const client = makeClient();

        await gateway.handleJoinTournament({ tournamentCode: 'ABC123' }, client);

        expect(client.join).toHaveBeenCalledWith('tournament:ABC123');
        expect(client.join).toHaveBeenCalledWith('tournament:ABC123:spectator');
        expect(client.emit).not.toHaveBeenCalledWith('join-error', expect.anything());
    });

    it('emits join-error and joins no room when the tournament code does not exist', async () => {
        const { gateway } = makeGateway(null);
        const client = makeClient();

        await gateway.handleJoinTournament({ tournamentCode: 'UNKNOWN' }, client);

        expect(client.emit).toHaveBeenCalledWith('join-error', { message: 'Tournoi introuvable.' });
        expect(client.join).not.toHaveBeenCalled();
    });
});

describe('RealtimeGateway.emitMatchUpdated', () => {
    it('emits match:updated to team rooms, the admin room, and the spectator room', () => {
        const { gateway, emitToRoom } = makeGateway(null);

        gateway.emitMatchUpdated('ABC123', 'TEAMA', 'TEAMB', { id: 'match-1' });

        expect(gateway.server.to).toHaveBeenCalledWith('tournament:ABC123:team:TEAMA');
        expect(gateway.server.to).toHaveBeenCalledWith('tournament:ABC123:team:TEAMB');
        expect(gateway.server.to).toHaveBeenCalledWith('tournament:ABC123:admin');
        expect(gateway.server.to).toHaveBeenCalledWith('tournament:ABC123:spectator');
        expect(emitToRoom).toHaveBeenCalledWith('match:updated', { id: 'match-1' });
    });
});

describe('resolveConnectionTarget', () => {
    it('targets the tournament of a tournament socket', () => {
        expect(resolveConnectionTarget({ tournamentCode: 'ABC123', teamCode: '1234' })).toEqual({
            key: 'tournament:ABC123',
            label: "tournament 'ABC123'",
        });
    });

    it('targets the session of a training socket', () => {
        expect(resolveConnectionTarget({ sessionCode: '7599' })).toEqual({
            key: 'training-session:7599',
            label: "training session '7599'",
        });
    });

    it('says so when the socket targets nothing', () => {
        expect(resolveConnectionTarget({})).toEqual({
            key: 'unknown',
            label: 'no tournament or training session',
        });
    });
});

describe('RealtimeGateway connection tracking', () => {
    function makeSocket(id: string, auth: Record<string, string>): Socket {
        return { id, handshake: { auth } } as unknown as Socket;
    }

    it('counts the connections of each tournament and training session separately', () => {
        const { gateway } = makeGateway(null);
        const debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

        const player = makeSocket('client-1', { tournamentCode: 'ABC123' });
        const trainee = makeSocket('client-2', { sessionCode: '7599' });
        const otherTrainee = makeSocket('client-3', { sessionCode: '7599' });
        gateway.handleConnection(player);
        gateway.handleConnection(trainee);
        gateway.handleConnection(otherTrainee);
        gateway.handleDisconnect(trainee);
        gateway.handleDisconnect(otherTrainee);

        expect(debug.mock.calls.map(([message]) => message)).toEqual([
            "[WS] New connection (client-1) to tournament 'ABC123'. 1 current connections.",
            "[WS] New connection (client-2) to training session '7599'. 1 current connections.",
            "[WS] New connection (client-3) to training session '7599'. 2 current connections.",
            "[WS] Disconnection (client-2) from training session '7599'. 1 current connections.",
            "[WS] Disconnection (client-3) from training session '7599'. 0 current connections.",
        ]);
        debug.mockRestore();
    });
});
