import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { Training } from './training.entity';

@Entity('training_member')
@Unique('UQ_training_member_training_code', ['training', 'code'])
export class TrainingMember {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Training, (training) => training.members, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'training_id' })
    training!: Training;

    @Column({ length: 100 })
    name!: string;

    // Copied on each check-in of the member: the same participant code for every session.
    @Column({ length: 4 })
    code!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
