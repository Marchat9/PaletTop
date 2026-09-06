import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { TrainingSession } from './training-session.entity';
import { TrainingRound } from './training-round.entity';
import { TrainingTeamMember } from './training-team-member.entity';
import { TrainingTeamKind } from 'src/enum/training.enum';

@Entity('training_team')
export class TrainingTeam {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => TrainingSession, (session) => session.teams, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'session_id' })
    session!: TrainingSession;

    // null = équipe FIXED (spanne toute la session) ; renseigné = équipe EPHEMERAL (ce round uniquement)
    @ManyToOne(() => TrainingRound, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'round_id' })
    round!: TrainingRound | null;

    @Column({ type: 'enum', enum: TrainingTeamKind })
    kind!: TrainingTeamKind;

    @Column({ nullable: true })
    name?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @OneToMany(() => TrainingTeamMember, (member) => member.team)
    members!: TrainingTeamMember[];
}
