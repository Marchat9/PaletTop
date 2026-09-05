import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { TrainingSession } from './training-session.entity';
import { TrainingMember } from './training-member.entity';
import { TrainingParticipantStatus } from 'src/enum/training.enum';

// Un membre du roster ne peut avoir qu'une seule présence active (PRESENT) par session — filet
// contre un double check-in (double-tap admin, deux appareils). Un membre reparti (status LEFT)
// puis re-check-in reste possible : l'index est partiel sur status='PRESENT', et NULL (joueurs de
// passage sans fiche roster) n'est jamais comparé à NULL en SQL, donc plusieurs joueurs de passage
// restent libres de coexister.
@Entity('training_participant')
@Unique(['session', 'code'])
@Index('UQ_training_participant_active_member', ['session', 'member'], {
    unique: true,
    where: `"status" = 'PRESENT'`,
})
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
