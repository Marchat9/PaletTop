# ChampionshipTournamentStrategy — Championnat (CHAMPIONSHIP)

## Principe

Le mode championnat repose sur une logique hôte/visiteur : certaines équipes sont des **hôtes fixes** (elles jouent toujours sur la même planche physique), tandis que les **visiteurs tournent** de planche en planche à chaque session selon un planning de rotation calculé à l'avance.

Ce mode est adapté aux compétitions de type championnat interclubes, où chaque club reçoit les équipes adverses à domicile.

## Structure envisagée

```
Session N
  ├── Pool 1 (planche A) : hôtes fixes A1–A4 vs visiteurs du tour N
  ├── Pool 2 (planche B) : hôtes fixes B1–B4 vs visiteurs du tour N
  └── Pool 3 (planche C) : hôtes fixes C1–C4 vs visiteurs du tour N
```

- Chaque pool représente une **planche physique** fixe pour toute la durée du tournoi
- Les hôtes d'un pool ne changent jamais de pool
- Les visiteurs effectuent une rotation circulaire entre les pools à chaque session

## Différences avec le mode STANDARD

| Aspect | STANDARD | CHAMPIONSHIP |
|--------|----------|-------------|
| Poules | Aléatoires, fixes pour le tournoi | Fixes, représentent des planches physiques |
| `assignTeamsToPools` | Distribution aléatoire | Attribution fixe hôte/visiteur |
| Appariement | Round-robin aléatoire | Hôtes vs visiteurs du tour |
| Bye | Possible | Non (nombre d'équipes toujours pair : 4×N hôtes + 4×N visiteurs) |
| Score → points | 1:1 | Par paliers (grille à définir) |

## État d'implémentation

Les trois méthodes sont des stubs qui lèvent `NotImplementedException` :
- `assignTeamsToPools` — attribution fixe hôte/visiteur
- `generateSessionMatches` — génération selon la rotation
- `computeRawScoreToPoints` — calcul de points par paliers

### Ce qui reste à faire

#### `assignTeamsToPools`
- Définir comment stocker le rôle hôte/visiteur (champ `isHome` sur `Team` ou attribut sur `TournamentPool`)
- Affecter les équipes hôtes aux pools définitivement au démarrage

#### `generateSessionMatches`
- Calculer quelle rotation de visiteurs est en cours (en fonction du nombre de sessions passées)
- Pour chaque pool : créer les matchs hôte vs visiteur
- Algorithme de rotation : déplacement circulaire d'index des visiteurs (ex : visiteurs décalés de +1 pool à chaque session)

#### `computeRawScoreToPoints`
- Définir la grille de conversion avec l'organisateur
- Stocker la grille dans `tournament.configuration` (champ à ajouter à `TournamentConfiguration`)

### Dépendances à injecter (lors de l'implémentation)

- `MatchRepository` — création et persistance des matchs
- `PoolRepository` — chargement des pools avec leurs équipes hôtes
- Potentiellement un service de calcul de rotation

## Calcul du classement

Le mode championnat utilise `computeRawScoreToPoints` pour convertir les scores bruts en points de classement. Une fois cette méthode implémentée, `computeGlobalRanking` doit être surchargée pour utiliser les points convertis plutôt que les scores bruts.
