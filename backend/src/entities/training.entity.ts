import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { TrainingMember } from './training-member.entity';
import { TrainingSession } from './training-session.entity';

@Entity('training')
export class Training {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    code!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    description?: string;

    @Column({ select: false })
    adminPassword!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @OneToMany(() => TrainingMember, (member) => member.training)
    members!: TrainingMember[];

    // The member who runs the group and also plays: their sessions offer a shortcut to their own
    // matches. Optional, and cleared by the database when that member is removed.
    @Column({ name: 'admin_member_id', type: 'uuid', nullable: true })
    adminMemberId!: string | null;

    @ManyToOne(() => TrainingMember, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'admin_member_id' })
    adminMember?: TrainingMember | null;

    @OneToMany(() => TrainingSession, (session) => session.training)
    sessions!: TrainingSession[];
}
