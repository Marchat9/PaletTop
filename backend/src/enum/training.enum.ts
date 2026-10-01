export enum TrainingSessionStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
}

export enum TrainingRoundStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
}

export enum TrainingTeamKind {
    FIXED = 'FIXED',
    EPHEMERAL = 'EPHEMERAL',
}

export enum TrainingParticipantStatus {
    PRESENT = 'PRESENT',
    LEFT = 'LEFT',
}

export enum TrainingTeamComposition {
    /** Teams drawn at random every round. */
    RANDOM = 'RANDOM',
    /** Every player gets a partner of a nearby level. */
    LEARNING = 'LEARNING',
}
