import { Nullable } from './nullable.model';

export type PlayerMatchStatus = 'PENDING' | 'ONGOING' | 'ENDED' | 'VALIDATED';

/** Habillage de la carte quand il n'y a pas de match : fin d'épreuve fêtée, ou simple attente. */
export type PlayerMatchEmptyTone = 'neutral' | 'celebration';

/**
 * Vue d'un match du point de vue du joueur, indépendante du tournoi comme de l'entraînement.
 *
 * Les deux contextes n'ont ni la même identité (une équipe nommée d'un côté, un individu et son
 * binôme du round de l'autre) ni le même vocabulaire : chaque page projette son propre DTO
 * vers ce modèle, et la carte n'a plus à savoir d'où elle vient.
 */
export interface PlayerMatchView {
  id: string;
  status: PlayerMatchStatus;
  isBye: boolean;
  /** Libellé de mon camp : nom d'équipe, ou noms des joueurs quand l'équipe n'en a pas. */
  myLabel: string;
  opponentLabel: string;
  myScore: number;
  opponentScore: number;
  /** Le camp A porte la couleur rouge des palets — l'info vient du match, pas de la page. */
  iAmTeamA: boolean;
  startedAt: Nullable<string>;
  finishedAt: Nullable<string>;
  /** « Plaque N°3 » côté tournoi, « Round 3 » côté entraînement. */
  subtitle: Nullable<string>;
}

/** Textes du bloc affiché quand le joueur ne joue pas ce round. */
export interface PlayerByeCopy {
  title: string;
  message: string;
  /** Gain acquis une fois le bye validé. Absent quand le repos ne rapporte rien. */
  awardLabel?: Nullable<string>;
  /** Affiché tant que le gain n'est pas acquis. */
  pendingLabel?: Nullable<string>;
}

/** Textes du bloc de validation, le code demandé n'ayant pas la même nature d'un contexte à l'autre. */
export interface PlayerValidationCopy {
  hint: string;
  placeholder: string;
}

/** Une ligne de l'historique des matchs du joueur. */
export interface PlayerMatchResult {
  id: string;
  /** « Match 3 » côté tournoi, « Round 3 » côté entraînement. */
  label: string;
  status: string;
  myScore: number;
  opponentLabel: string;
  opponentScore: number;
  isBye: boolean;
}

/** Une tuile de statistique affichée en tête de page joueur. */
export interface PlayerStatTile {
  key: string;
  label: string;
  value: string;
  clickable?: boolean;
}
