import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerClub } from 'src/entities/player_club.entity';

@Injectable()
export class PlayerClubRepository {
    constructor(
        @InjectRepository(PlayerClub)
        private readonly repo: Repository<PlayerClub>,
    ) {}

    async findOrCreate(rawName: string): Promise<PlayerClub> {
        const normalizedName = rawName.trim().replace(/\s+/g, '').toLowerCase();

        const existing = await this.repo
            .createQueryBuilder('club')
            .where("regexp_replace(lower(club.name), '\\s+', '', 'g') = :normalizedName", {
                normalizedName,
            })
            .getOne();

        if (existing) return existing;

        return this.repo.save(this.repo.create({ name: rawName.trim() }));
    }
}
