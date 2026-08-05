import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Tournament } from './tournament.entity';
import { Team } from './team.entity';

@Entity('tournament_pool')
export class TournamentPool {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Tournament, (tournament) => tournament.pools, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'tournament_id' })
    tournament!: Tournament;

    @Column()
    poolNumber!: number;

    @Column({ nullable: true, type: 'varchar', default: null })
    name!: string | null;

    @OneToMany(() => Team, (team) => team.pool)
    teams!: Team[];
}
