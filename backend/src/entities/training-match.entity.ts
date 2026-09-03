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
import { TrainingRound } from './training-round.entity';
import { TrainingSession } from './training-session.entity';
import { TrainingTeam } from './training-team.entity';
import { MatchStatus } from 'src/enum/status.enum';

@Entity('training_match')
export class TrainingMatch {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => TrainingRound, (round) => round.matches, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'round_id' })
    round!: TrainingRound;

    // Dénormalisé (comme TournamentMatch.tournament) pour interroger les matchs directement par session.
    @ManyToOne(() => TrainingSession, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session!: TrainingSession;

    @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.PENDING })
    status!: MatchStatus;

    @ManyToOne(() => TrainingTeam, { eager: true, nullable: false })
    @JoinColumn({ name: 'team_a_id' })
    teamA!: TrainingTeam;

    @ManyToOne(() => TrainingTeam, { eager: true, nullable: true })
    @JoinColumn({ name: 'team_b_id' })
    teamB!: TrainingTeam | null;

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
        if (!this.teamA || !this.round) {
            throw new Error('Un match doit avoir une équipe A et appartenir à un round.');
        }

        if (!this.isBye && (!this.teamB || this.teamA.id === this.teamB.id)) {
            throw new Error('Un match non-bye doit avoir deux équipes distinctes.');
        }
    }
}
