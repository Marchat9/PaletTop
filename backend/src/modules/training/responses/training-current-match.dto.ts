import { TrainingMatchDto } from './training-round.dto';

/**
 * Identité du participant qui interroge l'API. Elle n'est renvoyée qu'à celui qui a fourni son
 * propre code : sans elle, le client ne peut pas savoir lequel des deux camps du match est le
 * sien, ni se retrouver dans le classement (aucun payload public ne porte les codes).
 */
export interface TrainingParticipantIdentityDto {
    id: string;
    name: string;
}

export interface TrainingCurrentMatchDto {
    participant: TrainingParticipantIdentityDto;
    match: TrainingMatchDto | null;
    // Numéro du round en cours, même quand le participant n'y joue pas — de quoi situer le repos.
    roundNumber: number | null;
    sitOut: boolean; // true = le round courant existe mais ce participant est au repos ce round-ci (allowSitOut).
}
