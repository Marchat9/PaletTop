import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { TrainingSession } from './training-session.entity';
import { TrainingMatch } from './training-match.entity';
import { TrainingRoundStatus } from 'src/enum/training.enum';

@Entity('training_round')
@Unique(['session', 'roundNumber'])
export class TrainingRound {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => TrainingSession, (session) => session.rounds, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'session_id' })
    session!: TrainingSession;

    @Column({ type: 'int' })
    roundNumber!: number;

    @Column({
        type: 'enum',
        enum: TrainingRoundStatus,
        default: TrainingRoundStatus.OPEN,
    })
    status!: TrainingRoundStatus;

    @CreateDateColumn()
    createdAt!: Date;

    @OneToMany(() => TrainingMatch, (match) => match.round)
    matches!: TrainingMatch[];
}
