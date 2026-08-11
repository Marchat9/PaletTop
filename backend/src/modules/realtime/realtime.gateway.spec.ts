import { describe, expect, it, vi } from 'vitest';
import { Repository } from 'typeorm';
import { Tournament } from 'src/entities/tournament.entity';
import { RealtimeGateway } from './realtime.gateway';
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

function makeClient() {
    return {
        id: 'client-1',
        join: vi.fn(),
        emit: vi.fn(),
    } as any;
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
