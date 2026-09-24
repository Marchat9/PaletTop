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
    /** Équipes tirées au sort à chaque round. */
    RANDOM = 'RANDOM',
    /** Chaque joueur est associé à un partenaire d'un niveau voisin du sien. */
    LEARNING = 'LEARNING',
}
