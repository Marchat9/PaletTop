import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { TrainingSession } from './training-session.entity';
import { TrainingMember } from './training-member.entity';
import { TrainingParticipantStatus } from 'src/enum/training.enum';

@Entity('training_participant')
@Unique(['session', 'code'])
export class TrainingParticipant {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => TrainingSession, (session) => session.participants, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'session_id' })
    session!: TrainingSession;

    @ManyToOne(() => TrainingMember, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'member_id' })
    member!: TrainingMember | null;

    @Column({ length: 100 })
    name!: string;

    @Column()
    code!: string;

    @Column({
        type: 'enum',
        enum: TrainingParticipantStatus,
        default: TrainingParticipantStatus.PRESENT,
    })
    status!: TrainingParticipantStatus;

    @CreateDateColumn()
    createdAt!: Date;
}
