import { Team } from './team.entity';
import { Tournament } from './tournament.entity';
import { TournamentPool } from './tournament-pool.entity';
import { MatchesSession } from './matches-session.entity';
import { MatchStatus } from 'src/enum/status.enum';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('tournament_match')
export class TournamentMatch {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.PENDING })
    status!: MatchStatus;

    @ManyToOne(() => Team, (team: Team) => team.id, { eager: true, nullable: false })
    teamA!: Team;

    @ManyToOne(() => Team, (team: Team) => team.id, { eager: true, nullable: true })
    teamB!: Team | null;

    @ManyToOne(() => Tournament, (tournament: Tournament) => tournament.matches, {
        onDelete: 'CASCADE',
    })
    tournament!: Tournament;

    @ManyToOne(() => TournamentPool, { nullable: true, eager: false })
    @JoinColumn({ name: 'pool_id' })
    pool!: TournamentPool | null;

    @ManyToOne(() => MatchesSession, (session) => session.matches, {
        nullable: true,
        eager: false,
    })
    @JoinColumn({ name: 'session_id' })
    session!: MatchesSession | null;

    @Column({ type: 'int', nullable: true })
    sessionNumber!: number | null;

    @Column({ type: 'int', nullable: true })
    plateNumber!: number | null;

    @Column({ default: false })
    isBye!: boolean;

    @Column({ default: 0 })
    scoreA!: number;

    @Column({ default: 0 })
    scoreB!: number;

    @Column({ type: 'timestamptz', nullable: true })
    startedAt!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    finishedAt!: Date | null;

    @Column({ type: 'int', nullable: true })
    duration!: number | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @BeforeInsert()
    @BeforeUpdate()
    private validateMatch(): void {
        if (!this.teamA || !this.tournament) {
            throw new Error('Un match doit avoir une équipe A et appartenir à un tournoi.');
        }

        if (!this.isBye && (!this.teamB || this.teamA.id === this.teamB.id)) {
            throw new Error('Un match non-bye doit avoir deux équipes distinctes.');
        }

        if (this.teamA.tournament.id !== this.tournament.id) {
            throw new Error(
                "Les équipes d'un match doivent appartenir au même tournoi que le match.",
            );
        }

        if (this.teamB && this.teamB.tournament.id !== this.tournament.id) {
            throw new Error(
                "Les équipes d'un match doivent appartenir au même tournoi que le match.",
            );
        }
    }
}
