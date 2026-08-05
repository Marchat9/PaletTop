import { Player } from './player.entity';
import { Tournament } from './tournament.entity';
import { TournamentPool } from './tournament-pool.entity';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('team')
export class Team {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ length: 120 })
    name!: string;

    @Column()
    code!: string;

    @OneToMany(() => Player, (player: Player) => player.team, {
        cascade: true,
        orphanedRowAction: 'delete',
    })
    players!: Player[];

    @ManyToOne(() => Tournament, (tournament: Tournament) => tournament.teams, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'tournament_id' })
    tournament!: Tournament;

    @ManyToOne(() => TournamentPool, (pool) => pool.teams, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'pool_id' })
    pool!: TournamentPool | null;

    @BeforeInsert()
    @BeforeUpdate()
    private validatePlayers(): void {
        if (!this.players || this.players.length < 1) {
            throw new Error('Une équipe doit contenir au moins 1 joueur.');
        }

        for (const player of this.players) {
            player.team = this;

            if (this.tournament && !player.tournament) {
                player.tournament = this.tournament;
            }

            const teamTournamentId = this.tournament?.id;
            const playerTournamentId = player.tournament?.id;

            if (teamTournamentId && playerTournamentId && teamTournamentId !== playerTournamentId) {
                throw new Error('Un joueur et son équipe doivent appartenir au même tournoi.');
            }
        }
    }
}
