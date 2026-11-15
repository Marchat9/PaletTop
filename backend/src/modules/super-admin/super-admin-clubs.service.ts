import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { PlayerClubRepository } from 'src/modules/tournaments/repositories/player-club.repository';
import { SuperAdminClubMergeDto } from './dto/super-admin-club-merge.dto';

@Injectable()
export class SuperAdminClubsService {
    private readonly logger = new Logger(SuperAdminClubsService.name);

    constructor(private readonly clubRepo: PlayerClubRepository) {}

    // Merges the source club into the target one: everything is validated before the first write,
    // then players are moved (the FK is ON DELETE SET NULL, so before the delete), the source is
    // deleted, and only then the target renamed (club names are unique and the new name may be
    // the source's one).
    @Transactional()
    async mergeClubs(targetId: string, dto: SuperAdminClubMergeDto): Promise<void> {
        const sourceId = dto.sourceClubId;
        if (sourceId === targetId) {
            throw new BadRequestException('Impossible de fusionner un club avec lui-même.');
        }

        const clubs = await this.clubRepo.findByIds([targetId, sourceId]);
        const foundIds = new Set(clubs.map((club) => club.id));
        if (!foundIds.has(targetId) || !foundIds.has(sourceId)) {
            throw new NotFoundException('Club introuvable.');
        }

        if (dto.newName) {
            const duplicate = await this.clubRepo.findByNormalizedName(dto.newName, [
                targetId,
                sourceId,
            ]);
            if (duplicate) {
                throw new ConflictException('Un club avec ce nom existe déjà.');
            }
        }

        const movedPlayers = await this.clubRepo.movePlayers(sourceId, targetId);
        await this.clubRepo.deleteMany([sourceId]);
        if (dto.newName) {
            await this.clubRepo.rename(targetId, dto.newName);
        }

        this.logger.log(
            `Club ${sourceId} merged into ${targetId}: ${movedPlayers} player(s) moved${
                dto.newName ? ', target renamed' : ''
            }`,
        );
    }
}
