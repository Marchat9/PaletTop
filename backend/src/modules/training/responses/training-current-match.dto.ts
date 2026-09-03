import { TrainingMatchDto } from './training-round.dto';

export interface TrainingCurrentMatchDto {
    match: TrainingMatchDto | null;
    // true = le round courant existe mais ce participant est au repos ce round-ci (allowSitOut).
    sitOut: boolean;
}
