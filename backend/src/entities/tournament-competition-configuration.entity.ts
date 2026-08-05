import { Column } from 'typeorm';

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
}
