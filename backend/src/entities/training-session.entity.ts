import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Training } from './training.entity';
import { TrainingParticipant } from './training-participant.entity';
import { TrainingTeam } from './training-team.entity';
import { TrainingRound } from './training-round.entity';
import { TrainingSessionStatus, TrainingTeamComposition } from 'src/enum/training.enum';

@Entity('training_session')
export class TrainingSession {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Training, (training) => training.sessions, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'training_id' })
    training!: Training;

    @Column({ unique: true })
    code!: string;

    @Column({ type: 'timestamptz' })
    date!: Date;

    @Column({
        type: 'enum',
        enum: TrainingSessionStatus,
        default: TrainingSessionStatus.OPEN,
    })
    status!: TrainingSessionStatus;

    @Column({ type: 'int' })
    playersPerTeam!: number;

    /** Tailles d'équipe que le générateur peut utiliser, taille visée comprise. */
    @Column({ type: 'int', array: true, default: () => "'{}'" })
    allowedTeamSizes!: number[];

    /**
     * Arbitrage rendu à la création : garder la taille d'équipe demandée quitte à mettre des
     * joueurs au repos (`true`), ou faire jouer tout le monde quitte à ajuster les tailles
     * (`false`).
     */
    @Column({ default: false })
    preferTargetTeamSize!: boolean;

    /** Matchs simultanés possibles : les équipes en trop attendent le round suivant. */
    @Column({ type: 'int', default: 99 })
    plateCount!: number;

    @Column({
        type: 'enum',
        enum: TrainingTeamComposition,
        default: TrainingTeamComposition.RANDOM,
    })
    teamComposition!: TrainingTeamComposition;

    @Column({ default: true })
    avoidSamePartnerConsecutive!: boolean;

    @Column({ default: true })
    avoidSameOpponentConsecutive!: boolean;

    @Column({ type: 'int' })
    pointsPerGame!: number;

    @Column({ type: 'timestamptz' })
    lastActivityAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    closedAt!: Date | null;

    @CreateDateColumn()
    createdAt!: Date;

    @OneToMany(() => TrainingParticipant, (participant) => participant.session)
    participants!: TrainingParticipant[];

    @OneToMany(() => TrainingTeam, (team) => team.session)
    teams!: TrainingTeam[];

    @OneToMany(() => TrainingRound, (round) => round.session)
    rounds!: TrainingRound[];
}
