import { Column } from 'typeorm';
import { PairingMode } from 'src/enum/tounament.enum';

export abstract class TournamentCompetitionConfiguration {}

export class StructuredCompetitionConfiguration extends TournamentCompetitionConfiguration {
    @Column({ default: false })
    hasConsolanteTable!: boolean;

    @Column({ default: false })
    hasChallengePrincipaleTable!: boolean;

    @Column({ default: false })
    hasChallengeConsolanteTable!: boolean;

    @Column({ default: false })
    hasThirdPlaceMatch!: boolean;

    @Column({ nullable: true })
    principalBracketSize?: number;

    @Column({ default: 4 })
    numberOfQualifyingRounds!: number;

    @Column({ nullable: true })
    numberOfPools?: number;
}

export class UpDownCompetitionConfiguration extends TournamentCompetitionConfiguration {
    @Column({ nullable: true })
    numberOfRound?: number;

    @Column({ default: false })
    lastRoundByRanking?: boolean;

    /** Missing on tournaments created before the pairing mode existed: read as RANDOM. */
    @Column({ type: 'enum', enum: PairingMode, default: PairingMode.RANDOM })
    pairingMode?: PairingMode;
}

export class ChampionShipCompetitionConfiguration extends TournamentCompetitionConfiguration {
    @Column({ nullable: false })
    homeClub!: string;

    @Column({ nullable: false })
    awayClub!: string;
}
