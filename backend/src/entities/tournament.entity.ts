import { Team } from './team.entity';
import { TournamentMatch } from './tounament-match.entity';
import { TournamentPool } from './tournament-pool.entity';
import { MatchesSession } from './matches-session.entity';
import { TournamentConfiguration } from './tournament-configuration.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tournament')
export class Tournament {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    code!: string;

    @Column()
    name!: string;

    @Column({ select: false })
    adminPassword!: string;

    @Column({ type: 'timestamptz' })
    date!: Date;

    @Column({ nullable: true })
    description?: string;

    @Column(() => TournamentConfiguration, { prefix: false })
    configuration!: TournamentConfiguration;

    @Column({
        type: 'enum',
        enum: TournamentStatus,
        default: TournamentStatus.DRAFT,
    })
    status!: TournamentStatus;

    @OneToMany(() => Team, (team: Team) => team.tournament, { eager: true })
    teams!: Team[];

    @OneToMany(() => TournamentMatch, (match: TournamentMatch) => match.tournament)
    matches!: TournamentMatch[];

    @OneToMany(() => TournamentPool, (pool) => pool.tournament)
    pools!: TournamentPool[];

    @OneToMany(() => MatchesSession, (session) => session.tournament)
    matchsSessions!: MatchesSession[];

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    activatedAt?: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    completedAt?: Date | null;
}
