import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { TrainingTeam } from './training-team.entity';
import { TrainingParticipant } from './training-participant.entity';
import { TrainingTeamKind } from 'src/enum/training.enum';

@Entity('training_team_member')
@Unique(['team', 'participant'])
// Contrainte "un participant n'a jamais plus d'une équipe FIXED active" au niveau base (pas
// seulement applicatif) : ferme la race condition entre deux créations d'équipe concurrentes pour
// le même joueur. `kind` est dénormalisé depuis `team.kind` (immuable une fois l'équipe créée)
// pour permettre un index partiel simple, sans jointure.
@Index('UQ_training_team_member_active_fixed_participant', ['participant'], {
    unique: true,
    where: `"leftAt" IS NULL AND "kind" = 'FIXED'`,
})
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

    @Column({ type: 'enum', enum: TrainingTeamKind })
    kind!: TrainingTeamKind;
}
