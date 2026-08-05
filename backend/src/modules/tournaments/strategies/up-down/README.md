# UpDownTournamentStrategy — Tournoi montant-descendant (UP_DOWN)

## Principe

Le tournoi montant-descendant (aussi appelé progressif) ne repose pas sur des poules fixes. Toutes les équipes sont dans un seul groupe et s'affrontent selon leur niveau courant, qui se précise au fil des sessions.

- **Session 1** : tirage aléatoire (pas de classement disponible)
- **Sessions suivantes** : appariement par niveau — l'équipe classée 1re joue contre la 2e, la 3e contre la 4e, etc.

Ce système permet d'affiner progressivement le classement réel des équipes : les meilleures équipes se retrouvent face à des adversaires de niveau similaire au fil du tournoi.

## Différences avec le mode STANDARD

| Aspect | STANDARD | UP_DOWN |
|--------|----------|---------|
| Poules | Oui, fixes | Non — toutes les équipes dans un seul groupe |
| `assignTeamsToPools` | Distribution aléatoire | No-op (pas de poules) |
| Appariement | Round-robin aléatoire dans la poule | Par rang de classement courant |
| Bye | Possible (poule impaire) | Possible (nombre total d'équipes impair) |
| Classement | Par poule puis global | Global uniquement |

## État d'implémentation

`generateSessionMatches` n'est pas encore implémentée — elle lève `NotImplementedException`.

### Ce qui reste à faire

1. **Session 1** : tirage purement aléatoire entre toutes les équipes
2. **Sessions suivantes** :
   - Calculer le classement courant à partir de `pastMatches`
   - Apparier les équipes par rang (1 vs 2, 3 vs 4, …)
   - Gérer le bye si le nombre d'équipes est impair
   - Attribuer les numéros de plaque
   - Créer et persister les `TournamentMatch[]`

Les matchs créés n'ont **pas de pool** (`pool = null`).

### Dépendances à injecter (lors de l'implémentation)

- `MatchRepository` — pour créer et persister les matchs
- `DrawService` ou une logique équivalente — pour le tirage de la session 1
- Potentiellement `ByeUtils` pour la sélection de l'équipe exemptée

## Classement

`computeGlobalRanking` n'est plus surchargée ici : la classe de base gère déjà le tri selon `scoreCalculation` du tournoi (y compris les points par paliers pour `tournament_score`), ce qui couvre ce mode sans logique spécifique.
