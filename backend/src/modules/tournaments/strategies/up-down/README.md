# UpDownTournamentStrategy — Tournoi montant-descendant (UP_DOWN)

## Principe

Le tournoi montant-descendant ne repose pas sur des poules fixes : toutes les équipes sont dans une seule poule technique et jouent une série de parties.

- **Parties tirées au sort** : chaque partie est un tirage aléatoire sous contraintes (même club, revanche), via `generateMatchesInPool` — le même algorithme que les phases de poule du mode STANDARD.
- **Dernière partie au classement** (option `lastRoundByRanking`) : si l'option est cochée et que `numberOfRound` vaut au moins 2, la partie `numberOfRound` n'est pas tirée au sort.

## Dernière partie au classement

Quand `isRankingRound(config, sessionNumber)` est vrai :

1. Le classement global est calculé après la partie précédente (`computeGlobalRanking`, selon la méthode de calcul du tournoi).
2. Les équipes sont triées par rang ; une égalité stricte est départagée par l'identifiant de l'équipe (`orderTeamsByRanking`), pour un résultat reproductible.
3. Chaque équipe affronte son voisin de classement : 1re contre 2e, 3e contre 4e… (`generateMatchesByRanking`). Les contraintes de tirage sont ignorées.
4. Avec un nombre impair d'équipes, la dernière du classement est exemptée avec un **bye sans point** (0-0) : ni victoire, ni point, aussi bien dans le classement global que dans le classement de poule.
5. Les plaques suivent l'ordre du classement (plaque 1 = 1re contre 2e).

## Configuration

| Champ                | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `numberOfRound`      | Nombre de parties. Vide : illimité, l'admin clôture quand il le souhaite. |
| `lastRoundByRanking` | Dernière partie au classement. Requiert `numberOfRound >= 2`.             |

## Phase affichée (`phaseName`)

| Statut du tournoi                       | Libellé                                               |
| --------------------------------------- | ----------------------------------------------------- |
| Brouillon / annulé                      | _(vide)_                                              |
| En cours                                | `Partie x/N` (ou `Partie x` sans limite)              |
| En cours, dernière partie au classement | `Montée / Descente — Dernière partie (au classement)` |
| Terminé                                 | `Montée / Descente terminée`                          |

## Classement

`computeGlobalRanking` n'est pas surchargée ici : la classe de base trie selon `scoreCalculation` du tournoi, ce qui couvre ce mode sans logique spécifique.
