import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';
import { Column } from 'typeorm';
import { TournamentCompetitionConfiguration } from './tournament-competition-configuration.entity';

export class TournamentConfiguration {
    @Column()
    maxTeamCapacity!: number;

    @Column({ type: 'enum', enum: ScoreCalculation })
    scoreCalculation!: ScoreCalculation;

    @Column()
    pointsPerGame!: number;

    @Column({ default: true })
    rematch!: boolean;

    @Column({ default: true })
    matchAgainstFullSameClub!: boolean;

    @Column({ default: true })
    matchAgainstPartialSameClub!: boolean;

    @Column({ type: 'enum', enum: CompetitionMode })
    competitionMode!: CompetitionMode;

    @Column({ type: 'jsonb', nullable: false })
    competitionConfiguration!: TournamentCompetitionConfiguration;
}
