import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TrainingTeam } from './training-team.entity';
import { TrainingParticipant } from './training-participant.entity';

@Entity('training_team_member')
@Unique(['team', 'participant'])
export class TrainingTeamMember {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => TrainingTeam, (team) => team.members, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'team_id' })
    team!: TrainingTeam;

    @ManyToOne(() => TrainingParticipant, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'participant_id' })
    participant!: TrainingParticipant;

    // null = membre actuellement actif dans l'équipe ; renseigné = détaché (dissolution non destructive,
    // conserve le lien pour le calcul du classement et l'auth des matchs déjà joués).
    @Column({ type: 'timestamptz', nullable: true })
    leftAt!: Date | null;
}
