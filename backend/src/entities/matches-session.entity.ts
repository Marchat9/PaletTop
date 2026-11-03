import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { MatchesSessionStatus } from 'src/enum/status.enum';
import { Tournament } from './tournament.entity';
import { TournamentMatch } from './tounament-match.entity';

@Entity('matches_session')
// Two concurrent starts or next-session calls would otherwise both create the same session.
@Unique('UQ_matches_session_tournament_number', ['tournament', 'sessionNumber'])
export class MatchesSession {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Tournament, (tournament) => tournament.matchsSessions, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'tournament_id' })
    tournament!: Tournament;

    @Column()
    sessionNumber!: number;

    @Column({
        type: 'enum',
        enum: MatchesSessionStatus,
        default: MatchesSessionStatus.OPEN,
    })
    status!: MatchesSessionStatus;

    @OneToMany(() => TournamentMatch, (match) => match.session)
    matches!: TournamentMatch[];
}
