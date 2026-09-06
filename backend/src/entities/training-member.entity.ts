import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Training } from './training.entity';

@Entity('training_member')
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

    @CreateDateColumn()
    createdAt!: Date;
}
