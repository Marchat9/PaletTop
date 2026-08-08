export enum ConstraintLevel {
    NO_SAME_CLUB, // interdit : tous appartiennent au même club
    NO_PARTIAL_SAME_CLUB, // interdit : une partie des membres appartiennent au même club
    NO_REMATCH_NO_SAME_CLUB, // interdit : rematch + tous appartiennent au même club
    NO_REMATCH_NO_PARTIAL_SAME_CLUB, // interdit : rematch + une partie des membres appartiennent au même club
    NO_REMATCH, // interdit : rematch uniquement
    NO_CONTRAINTE, // aucune contrainte
}
