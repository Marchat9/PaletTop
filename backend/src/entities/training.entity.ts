import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
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
    club?: string;

    @Column({ select: false })
    adminPassword!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @OneToMany(() => TrainingMember, (member) => member.training)
    members!: TrainingMember[];

    @OneToMany(() => TrainingSession, (session) => session.training)
    sessions!: TrainingSession[];
}
