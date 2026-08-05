# StructuredTournamentStrategy — Tournoi structuré (STANDARD)

## Principe

Le tournoi structuré est le mode par défaut. Les équipes sont réparties en poules au démarrage, puis jouent des sessions de round-robin au sein de leur poule. À chaque session, les paires sont tirées au sort en respectant les contraintes (pas de rematch, pas d'équipes du même club si possible).

## Comportement par session

```
startTournament()
  │
  ├── assignTeamsToPools()   → Distribution aléatoire des équipes dans les poules (Fisher-Yates)
  │
  └── generateSessionMatches()
        │
        ├── Pour chaque poule :
        │     ├── Si nombre d'équipes impair → sélectionner le bye (équipe avec le moins de byes passés)
        │     └── Tirer les paires (DrawService — backtracking avec 4 niveaux de contrainte)
        │
        └── Attribuer les numéros de plaque séquentiellement (1, 2, 3…)
```

## Contraintes du tirage au sort

`DrawService.generatePairs` applique 4 niveaux de contrainte, dans l'ordre :

1. **NO_REMATCH_NO_SAME_CLUB** — interdit les rematches et tous appariements du même club
2. **NO_REMATCH_NO_HOMOGENEOUS_CLUB** — interdit les rematches et les appariements entre deux équipes mono-club
3. **NO_REMATCH** — interdit uniquement les rematches
4. **NO_CONTRAINTE** — aucune contrainte (toujours une solution)

Si aucune solution complète n'est trouvée au niveau courant, le niveau suivant est essayé automatiquement.

## Bye

Quand une poule a un nombre impair d'équipes, une équipe reçoit un bye :
- L'équipe exemptée est celle qui a le moins de byes dans les sessions passées (aléatoire en cas d'égalité)
- Le match bye est créé avec `scoreA = pointsPerGame`, `scoreB = 0`, statut `VALIDATED`, `isBye = true`
- L'équipe exemptée remporte le bye automatiquement (victoire comptabilisée dans le classement)

## Méthodes héritées (comportement par défaut suffisant)

- `canStartNextSession` → vérifie que tous les matchs de la session sont VALIDATED
- `computeGlobalRanking` → tri selon `scoreCalculation` du tournoi (par défaut : wins DESC, goalAverage DESC)
- `computeTeamHistory` → filtre les matchs VALIDATED des sessions fermées
- `canCompleteTournament` → vérifie que le tournoi est en statut ACTIVE
- `assignPlateNumbers` → numérotation séquentielle 1, 2, 3…

## Phase d'élimination (non encore implémentée)

La méthode privée `generateEliminationMatches` est un stub documenté pour la future phase d'élimination. Elle sera appelée après les qualifications pour générer le tableau selon la configuration `eliminationTableaux` du tournoi (principale, consolante A/B, challenge, etc.).

## Dépendances injectées

| Dépendance | Rôle |
|-----------|------|
| `PoolService` | Affectation aléatoire des équipes aux poules |
| `DrawService` | Tirage des paires avec contraintes |
| `MatchRepository` | Création et persistance des matchs |
| `PoolRepository` | Chargement des poules avec leurs équipes et joueurs |
