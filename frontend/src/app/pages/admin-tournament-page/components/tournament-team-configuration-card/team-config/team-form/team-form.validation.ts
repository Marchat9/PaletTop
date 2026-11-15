import { Nullable } from 'src/app/models/nullable.model';

/** Error of a player row whose name is blank; `visible` is true once the row is touched or a submit was attempted. */
export function getPlayerNameError(
  index: number,
  name: string,
  visible: boolean,
): Nullable<string> {
  if (!visible || name.trim()) {
    return null;
  }
  return `Renseignez le nom du joueur ${index + 1}, ou retirez la ligne.`;
}

/** Error of a championship team without a club. */
export function getTeamClubError(
  isChampionship: boolean,
  club: string,
  visible: boolean,
): Nullable<string> {
  if (!visible || !isChampionship || club) {
    return null;
  }
  return "Choisissez le club pour créer l'équipe.";
}
