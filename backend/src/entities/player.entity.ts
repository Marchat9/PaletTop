import { PlayerClub } from 'src/entities/player_club.entity';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { Tournament } from './tournament.entity';

@Entity('players')
export class Player {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ length: 100 })
    name!: string;

    @ManyToOne(() => PlayerClub, (playerClub: PlayerClub) => playerClub.player, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'player_club_id' })
    club?: PlayerClub;

    @ManyToOne(() => Team, (team: Team) => team.players, {
        nullable: false,
        onDelete: 'CASCADE',
        orphanedRowAction: 'delete',
    })
    @JoinColumn({ name: 'team_id' })
    team!: Team;

    @ManyToOne(() => Tournament, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'tournament_id' })
    tournament!: Tournament;

    @BeforeInsert()
    @BeforeUpdate()
    private validateTournamentConsistency(): void {
        const teamTournamentId = this.team?.tournament?.id;
        const playerTournamentId = this.tournament?.id;

        if (teamTournamentId && playerTournamentId && teamTournamentId !== playerTournamentId) {
            throw new Error('Un joueur doit appartenir au même tournoi que son équipe.');
        }
    }
}
