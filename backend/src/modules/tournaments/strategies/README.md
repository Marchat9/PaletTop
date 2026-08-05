# Pattern Strategy — Types de tournoi

## Principe

Chaque type de tournoi (`CompetitionMode`) a son propre comportement pour la génération de sessions, la gestion des poules et le calcul du classement. Le pattern Strategy encapsule ces comportements dans des classes dédiées, ce qui permet d'ajouter de nouveaux types de tournoi sans toucher aux services existants.

```
TournamentStrategy (abstract)
├── StructuredTournamentStrategy   → CompetitionMode.STANDARD
├── UpDownTournamentStrategy       → CompetitionMode.UP_DOWN
└── ChampionshipTournamentStrategy → CompetitionMode.CHAMPIONSHIP
```

## Architecture

### Classe abstraite `TournamentStrategy`

Définit le contrat et fournit des comportements par défaut réutilisables :

| Méthode                   | Par défaut                             | Surchargeable   |
| ------------------------- | -------------------------------------- | --------------- |
| `generateSessionMatches`  | Lance `NotImplementedException`        | **Obligatoire** |
| `assignTeamsToPools`      | No-op (méthode vide, aucune poule créée) | Oui             |
| `canStartNextSession`     | Tous les matchs VALIDATED              | Oui             |
| `canCompleteTournament`   | Tournoi en statut ACTIVE               | Oui             |
| `computeGlobalRanking`    | Tri selon `scoreCalculation` (défaut : wins DESC, goalAverage DESC) | Oui             |
| `computeTeamHistory`      | Filtre VALIDATED + map MatchHistoryDto | Oui             |
| `assignPlateNumbers`      | Numérotation séquentielle 1, 2, 3…     | Oui             |
| `computeRawScoreToPoints` | Score brut 1:1                         | Oui             |

### Factory `TournamentStrategyFactory`

Service NestJS injectable qui instancie la bonne stratégie selon `CompetitionMode` :

```typescript
const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
await strategy.generateSessionMatches(tournament, session, pastMatches);
```

### Intégration dans les services

- **`SessionService`** : utilise la stratégie pour `assignTeamsToPools`, `generateSessionMatches`, `canStartNextSession`, `canCompleteTournament`
- **`RankingService`** : utilise la stratégie pour `computeGlobalRanking` et `computeTeamHistory`

---

## Créer une nouvelle stratégie

### Étape 1 — Ajouter la valeur dans l'enum

Dans `backend/src/enum/tounament.enum.ts` :

```typescript
export enum CompetitionMode {
    STANDARD = 'standard',
    UP_DOWN = 'up_down',
    CHAMPIONSHIP = 'championship',
    MA_NOUVELLE_MODE = 'ma_nouvelle_mode', // ← ajouter ici
}
```

### Étape 2 — Créer le dossier et la classe

```
backend/src/modules/match/strategies/
└── ma-nouvelle-mode/
    ├── ma-nouvelle-mode-tournament.strategy.ts
    └── README.md
```

La classe doit étendre `TournamentStrategy` et implémenter au minimum `generateSessionMatches` :

```typescript
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStrategy } from '../tournament-strategy.abstract';

export class MaNouvelleModeTournamentStrategy extends TournamentStrategy {
    override async generateSessionMatches(
        tournament: Tournament,
        session: MatchesSession,
        pastMatches: TournamentMatch[],
    ): Promise<TournamentMatch[]> {
        // Votre logique ici
        // Retourner et persister les TournamentMatch[] créés
    }
}
```

Surcharger uniquement les méthodes dont le comportement diffère du défaut.

### Étape 3 — Enregistrer dans la factory

Dans `tournament-strategy.factory.ts`, ajouter un case :

```typescript
case CompetitionMode.MON_NOUVEAU_MODE:
  return new MonNouveauModeTournamentStrategy(/* injecter les dépendances si besoin */);
```

Si la stratégie a besoin de services NestJS (repositories, services métier), les injecter dans le constructeur de la factory et les passer à la stratégie :

```typescript
// Dans la factory :
constructor(
  // ... existants
  private readonly maNouvelleDep: MaNouvelleService,
) {}

create(mode: CompetitionMode): TournamentStrategy {
  case CompetitionMode.MON_NOUVEAU_MODE:
    return new MonNouveauModeTournamentStrategy(this.maNouvelleDep);
}

// Dans match.module.ts, ajouter MonNouveauService aux providers si nécessaire
```

### Étape 4 — Documenter

Créer un `README.md` dans le dossier de la stratégie (voir les autres comme modèle).

---

## Dépendances disponibles dans la factory

| Dépendance        | Usage typique                                                            |
| ----------------- | ------------------------------------------------------------------------ |
| `PoolService`     | Affectation des équipes aux poules                                       |
| `DrawService`     | Génération des paires d'équipes (backtracking, contraintes club/rematch) |
| `MatchRepository` | Création et persistance des matchs                                       |
| `PoolRepository`  | Chargement des poules avec leurs équipes                                 |

Pour ajouter d'autres dépendances, les déclarer dans le constructeur de `TournamentStrategyFactory` et enregistrer les services concernés dans `match.module.ts`.
